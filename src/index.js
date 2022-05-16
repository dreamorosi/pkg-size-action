import assert from 'assert';
import { getInput, setFailed } from '@actions/core';
import { context } from '@actions/github';
import { sub } from './lib/markdown.js';
import upsertComment from './lib/upsert-comment.js';
import generateSizeReport from './lib/generate-size-report.js';
import * as log from './lib/log.js';
import exec from './lib/exec.js';

const COMMENT_SIGNATURE = sub('🤖 This report was automatically generated by [pkg-size-action](https://github.com/pkg-size/action/)');

(async () => {
	const { GITHUB_TOKEN } = process.env;
	assert(GITHUB_TOKEN, 'Environment variable "GITHUB_TOKEN" not set. Required for accessing and reporting on the PR.');

	const { pull_request: pr } = context.payload;

	const sizeReport = await generateSizeReport({
		pr,
		buildCommand: getInput('build-command'),
		workDirectory: getInput('work-directory'),
		distDirectory: getInput('dist-directory'),
		skipNpmCi: getInput('skip-npm-ci'),
		commentReport: getInput('comment-report'),
		mode: getInput('mode') || 'regression',
		unchangedFiles: getInput('unchanged-files') || 'collapse',
		hideFiles: getInput('hide-files'),
		sortBy: getInput('sort-by') || 'delta',
		sortOrder: getInput('sort-order') || 'desc',
		displaySize: getInput('display-size') || 'uncompressed',
	});
	await exec(`git checkout -f ${context.sha}`);

	if (sizeReport) {
		await upsertComment({
			token: GITHUB_TOKEN,
			commentSignature: COMMENT_SIGNATURE,
			repo: context.repo,
			prNumber: pr.number,
			body: sizeReport,
		});
	}
})().catch((error) => {
	setFailed(error.message);
	log.warning(error.stack);
});

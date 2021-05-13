const { Octokit } = require("@octokit/core");
const AdmZip = require('adm-zip');

// Repo Definitions....
var defaultRepo = {
    owner: 'EdgeTX',
    repo: 'EdgeTX',
    authKey: `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`
}

async function downloadArtifact(firmwareFile, artifact, repoInfo) {
    const octokit = new Octokit({ auth: repoInfo.authKey });

    const artifactzip = await octokit.request('GET /repos/{owner}/{repo}/actions/artifacts/{artifact_id}/{archive_format}', {
        owner: repoInfo.owner,
        repo: repoInfo.repo,
        artifact_id: artifact,
        archive_format: 'zip'
    })

    var zip = new AdmZip(Buffer.from(artifactzip.data));
    var zipEntries = zip.getEntries();

    var bufferFW;

    zipEntries.forEach((entry) => {
        if (entry.entryName.startsWith(firmwareFile)) {
            bufferFW = entry.getData()
        }
    });

    return bufferFW;
}

// eslint-disable-next-line no-unused-vars
async function downloadMetadata(artifact, repoInfo) {
    const octokit = new Octokit({ auth: repoInfo.authKey });

    console.log("Downloading binary...");
    const artifactzip = await octokit.request('GET /repos/{owner}/{repo}/actions/artifacts/{artifact_id}/{archive_format}', {
        owner: repoInfo.owner,
        repo: repoInfo.repo,
        artifact_id: artifact,
        archive_format: 'zip'
    })

    var zip = new AdmZip(Buffer.from(artifactzip.data));
    var zipEntries = zip.getEntries();

    var indexdata = "";
    console.log("Loading zip entries...");

    zipEntries.forEach((entry) => {
        if (entry.entryName == "fw.json") {
            indexdata = JSON.parse(entry.getData().toString('utf8'));
        }
    });

    return indexdata;
}

async function indexArtifacts(repoInfo) {
    const octokit = new Octokit({ auth: repoInfo.authKey });

    const artifacts = await octokit.request('GET /repos/{owner}/{repo}/actions/artifacts', {
        owner: repoInfo.owner,
        repo: repoInfo.repo,
    })

    return artifacts.data.artifacts;
}


exports.downloadArtifact = downloadArtifact;
exports.indexArtifacts = indexArtifacts;
exports.downloadMetadata = downloadMetadata;
exports.defaultRepo = defaultRepo;

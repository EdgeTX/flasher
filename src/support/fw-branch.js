const { Octokit } = require("@octokit/core");
const AdmZip = require('adm-zip');
const axios = require('axios');
//const { createAppAuth, createOAuthUserAuth } = require("@octokit/auth-app");

// Repo Definitions....
var defaultRepo = {
    owner: 'EdgeTX',
    repo: 'EdgeTX',
    authKey: atob("Z2hwX2JQQUo3TWhybUMxcmVPbjdQN0htRGg0aDBDVldsSzJPQTNYcQ==")
}

var sdCardRepo = {
    owner: 'EdgeTX',
    repo: 'edgetx-sdcard',
    authKey: atob("Z2hwX2JQQUo3TWhybUMxcmVPbjdQN0htRGg0aDBDVldsSzJPQTNYcQ==")
}

var voiceRepo = {
    owner: 'EdgeTX',
    repo: 'edgetx-sdcard-sounds',
    authKey: atob("Z2hwX2JQQUo3TWhybUMxcmVPbjdQN0htRGg0aDBDVldsSzJPQTNYcQ==")
}

async function downloadArtifact(firmwareFile, artifact, repoInfo) {
    const octokit = new Octokit({
        auth: repoInfo.authKey
    });

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

async function downloadFwRelease(firmwareFile, bdurl) {
    const artifactzip = await axios.get(bdurl, {
        responseType: 'arraybuffer',
    });

    var zip = new AdmZip(Buffer.from(artifactzip.data));
    var zipEntries = zip.getEntries();

    var bufferFW;

    zipEntries.forEach((entry) => {
        if (entry.entryName.startsWith(firmwareFile) || entry.entryName.startsWith("edgetx-firmware-nightly/"+firmwareFile)) {
            bufferFW = entry.getData()
        }
    });

    return bufferFW;
}


// eslint-disable-next-line no-unused-vars
async function downloadMetadata(artifact, repoInfo) {
    const octokit = new Octokit({
        auth: repoInfo.authKey
    });

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

async function downloadReleaseMetadata(bdurl) {
    const artifactzip = await axios.get(bdurl, {
        responseType: 'arraybuffer',
    });

    var zip = new AdmZip(Buffer.from(artifactzip.data));
    var zipEntries = zip.getEntries();

    var indexdata = "";
    console.log("Loading zip entries...");

    zipEntries.forEach((entry) => {
        if (entry.entryName == "fw.json" || entry.entryName == "edgetx-firmware-nightly/fw.json") {
            indexdata = JSON.parse(entry.getData().toString('utf8'));
        }
    });

    return indexdata;
}

async function indexArtifacts(repoInfo) {
    const octokit = new Octokit({
        auth: repoInfo.authKey
    });

    const artifacts = await octokit.request('GET /repos/{owner}/{repo}/actions/runs', { //GET /repos/{owner}/{repo}/actions/artifacts', {
        owner: repoInfo.owner,
        repo: repoInfo.repo,
    })

    //return artifacts.data.artifacts;
    return artifacts.data.workflow_runs;
}

async function indexTags(repoInfo) {
    const octokit = new Octokit({
        auth: repoInfo.authKey
    });

    const releases = await octokit.request('GET /repos/{owner}/{repo}/releases', { //GET /repos/{owner}/{repo}/actions/artifacts', {
        owner: repoInfo.owner,
        repo: repoInfo.repo,
    })

    //return artifacts.data.artifacts;
    return releases.data;
}

async function branchArtifact(repoInfo, repourl) {
    const octokit = new Octokit({
        auth: repoInfo.authKey
    });

    const artifactInfo = await octokit.request('GET '+repourl, {});

    return artifactInfo.data;
}

async function listReleases(repoInfo) {
    const octokit = new Octokit({
        auth: repoInfo.authKey
    });

    var releaselist = await octokit.request('GET /repos/{owner}/{repo}/releases', {
        owner: repoInfo.owner,
        repo: repoInfo.repo,
    })

    return releaselist.data;
}

exports.downloadArtifact = downloadArtifact;
exports.downloadFwRelease = downloadFwRelease;
exports.indexArtifacts = indexArtifacts;
exports.downloadMetadata = downloadMetadata;
exports.branchArtifact = branchArtifact;
exports.listReleases = listReleases;
exports.indexTags = indexTags;
exports.downloadReleaseMetadata = downloadReleaseMetadata;

exports.defaultRepo = defaultRepo;
exports.voiceRepo = voiceRepo;
exports.sdCardRepo = sdCardRepo;

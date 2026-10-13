#!/usr/bin/env node
import {execFileSync} from "node:child_process";
import {assertClean,trackedFiles} from "./security-gate.mjs";
const staged=process.argv.includes("--staged");
const files=staged?execFileSync("git",["diff","--cached","--name-only","-z"],{encoding:"utf8"}).split("\0").filter(Boolean):trackedFiles(process.cwd());
assertClean(process.cwd(),files);
console.log("Buildkit credential checks passed for "+files.length+" files.");

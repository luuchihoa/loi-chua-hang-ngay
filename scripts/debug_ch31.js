import { execSync } from 'child_process';
import * as cheerio from 'cheerio';
import fs from 'fs';

const html = execSync('curl -sL "https://augustino.net/sach-cham-ngon-chuong-31"').toString();
const $ = cheerio.load(html);
const contentDiv = $('#page-content').length ? $('#page-content') : $('.content');

console.log("=== RAW CONTENT DIV HTML SAMPLE ===");
console.log(contentDiv.html().substring(0, 3000));
fs.writeFileSync('scratch/ch31_raw.html', contentDiv.html(), 'utf-8');

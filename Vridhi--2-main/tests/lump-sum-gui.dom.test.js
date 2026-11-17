#!/usr/bin/env node
'use strict';
/* Behavioural check of Planning Period > Lump Sum in a simulated browser. Needs jsdom (not a project dependency):
   `npm install jsdom` somewhere on the module path, then run this file. Without jsdom it prints SKIP and exits 0. */
const fs = require("fs"), path = require("path");
let JSDOM;
try { ({ JSDOM } = require("jsdom")); } catch (e) { console.log("SKIP lump-sum-gui.dom.test.js: jsdom is not installed"); process.exit(0); }
const mods = path.join(__dirname, "..", "modules", "retirement-planner") + path.sep;
const dom = new JSDOM(`<!doctype html><html><body><dialog id="dg"></dialog></body></html>`, { runScripts: "outside-only", pretendToBeVisual: true });
const w = dom.window;
w.HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
w.HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); this.dispatchEvent(new w.Event("close")); };
w.eval(fs.readFileSync(mods + "engine.js", "utf8"));
w.eval(fs.readFileSync(mods + "ui.js", "utf8"));
const d = w.document;
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("PASS", m); } else { fail++; console.log("FAIL", m); } };
const $ = id => d.getElementById("fh-" + id);
const type = (id, v, ev = "input") => { const el = $(id); el.value = v; el.dispatchEvent(new w.Event(ev, { bubbles: true })); };
const click = sel => { const el = d.querySelector(sel); if (!el) throw new Error("missing " + sel); el.click(); };
const rows = () => d.querySelectorAll("#fh-lumptbody tr").length;

w.fhOpen("status");
type("age", "45"); type("until", "85");
// emulate the Lump Sum tab being the visible one (jsdom will not focus inside hidden ancestors)
click('[data-fh-plan="lump"]');
for (let n = $("lump"); n && n !== d.body; n = n.parentElement) n.removeAttribute("hidden");
ok(!$("lump-empty").hidden && $("lump-body").hidden, "empty state shown, grid hidden with zero rows");
const yr = new w.Date().getFullYear();
ok(!d.body.textContent.includes("Years available") && !d.body.textContent.includes("added to the general corpus"), "information lines are gone from the tab");
ok([...d.querySelectorAll("#fh-lumptbl thead th")].map(h => h.textContent.trim().replace(/\s+/g, " ")).slice(0, 6).join("|") === "Source|Amount|Year|ROI %|Annual Income (\u20b9)|Principal", "requested column headers");

click("#fh-lumpadd");
ok(rows() === 1 && $("lump-empty").hidden && !$("lump-body").hidden, "add: one row, empty state hidden");
const ed1 = d.querySelector('[data-fh-lump-stream="1"]');
ok(!ed1.hidden, "add: editor panel opens for the new row");
ok(d.querySelector('[data-fh-lump-cancel="1"]').hidden === false, "add: Cancel visible for a new row");
ok(/New lump sum 1/.test(d.querySelector('[data-fh-lump-edtitle="1"]').textContent), "add: title says New lump sum 1");
ok(!/Incomplete|Check/.test(d.querySelector("#fh-lumptbody tr").textContent), "incomplete row has no status text on the grid");
ok(d.activeElement === $("lumpLabel1"), "add: focus moves to the label field");

type("lumpLabel1", "Maturity");
type("lumpAmount1", "10,00,000");
const years = [...$("lumpYear1").options].map(o => o.value).filter(Boolean);
ok(years[0] === String(yr + 1) && years.length === 40, `year dropdown limited to plan window (${years[0]}-${years[years.length-1]})`);
type("lumpYear1", String(yr + 4), "change");
type("lumpRate1", "7");
const calc = d.querySelector('[data-fh-lump-calc="1"]').textContent;
ok(/70,000/.test(calc), "auto yearly income = amount x rate: " + calc);
ok(/10,00,000/.test($("lumpAmount1").value), "amount shows Indian grouping");

click('[data-fh-lump-done="1"]');
ok(ed1.hidden, "Done closes the editor");
const rowText = d.querySelector("#fh-lumptbody tr").textContent;
ok(/Maturity/.test(rowText) && /10,00,000/.test(rowText) && /70,000/.test(rowText) && !/Check|Incomplete/.test(rowText), "grid row shows label, amount, income, no status pill");
ok(/10,00,000/.test($("lumptotal-amount").textContent) && /70,000/.test($("lumptotal-income").textContent), "totals row: " + $("lumptotal-amount").textContent + " / " + $("lumptotal-income").textContent);
ok(!$("lump-warning"), "incomplete-row warning is removed from the Lump Sum tab");

click("#fh-lumpadd");
ok(rows() === 2 && !d.querySelector('[data-fh-lump-stream="2"]').hidden, "add another: row 2 opens in its editor");
ok([...$("lumpTreatment2").options].map(option => option.textContent).join("|") === "Keep|Withdraw", "principal options use Keep and Withdraw");
click('[data-fh-lump-cancel="2"]');
ok(rows() === 1, "cancel on a new row drops it");

click('[data-fh-lump-delete="1"]');
ok(rows() === 0 && !$("lump-empty").hidden, "delete: row gone, empty state back");
ok(!$("lump-undo").hidden && /Maturity/.test($("lump-undo").textContent), "delete: Undo banner names the row");
ok(d.activeElement && d.activeElement.id === "fh-lumpundo", "delete: focus moves to Undo");
click("#fh-lumpundo");
ok(rows() === 1 && /10,00,000/.test(d.querySelector("#fh-lumptbody tr").textContent) && $("lump-undo").hidden, "undo restores the row with its values");

click('[data-fh-lump-edit="1"]');
ok(!d.querySelector('[data-fh-lump-stream="1"]').hidden && d.querySelector('[data-fh-lump-cancel="1"]').hidden, "edit: editor opens, no Cancel for an existing row");
type("lumpTreatment1", "spent", "change");
ok($("lumpRate1").value === "0" && $("lumpRate1").disabled, "Spent forces rate to 0 and locks it");
ok(/\u20b9\s?0\b/.test(d.querySelector('[data-fh-lump-calc="1"]').textContent), "Spent: auto income shows 0: " + d.querySelector('[data-fh-lump-calc="1"]').textContent);
type("lumpTreatment1", "keep", "change");
type("lumpRate1", "7");
ok(!$("lumpRate1").disabled && /70,000/.test(d.querySelector('[data-fh-lump-calc="1"]').textContent), "back to Keep invested re-enables rate and income");

type("lumpAmount1", "");
click('[data-fh-lump-done="1"]');
ok(!d.querySelector('[data-fh-lump-stream="1"]').hidden && /amount/i.test($("lumpAmount1-e").textContent), "Done with blank amount stays open and shows: " + $("lumpAmount1-e").textContent);
ok($("lumpAmount1").getAttribute("aria-invalid") === "true", "invalid field gets aria-invalid");
type("lumpAmount1", "10,00,000");
type("lumpRate1", "150");
ok(/Check/.test(d.querySelector("#fh-lumptbody tr").textContent), "out-of-range rate flags the grid row with a Check pill");
type("lumpRate1", "7");
click('[data-fh-lump-done="1"]');
ok(d.querySelector('[data-fh-lump-stream="1"]').hidden, "valid row closes again");

click("#fh-lumpadd");
click('[data-fh-lump-done="2"]');
ok(!d.querySelector('[data-fh-lump-stream="2"]').hidden && /amount/i.test($("lumpAmount2-e").textContent), "Done on a blank new row is blocked");
click('[data-fh-lump-cancel="2"]');
ok(rows() === 1, "Cancel removes the blank row");
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

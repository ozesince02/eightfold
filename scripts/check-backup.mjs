// Checks when the "save a backup" nudge is due. Runs the real store in Node, where storage is
// unavailable: saves fail quietly, which is also a check that a failed save is reported, not thrown.
import assert from 'node:assert/strict';
import { store, BACKUP_EVERY_DAYS } from '../src/lib/store.js';

const DAY = 86400000;
const now = Date.now();
let lastSaveEvent = null;
store.subscribe((state, info) => { lastSaveEvent = info; });

assert.equal(store.mode(), 'local');
assert.equal(store.backupDue(now), 0, 'never used: nothing due');

store.meta().firstUsedAt = now - (BACKUP_EVERY_DAYS - 1) * DAY;
assert.equal(store.backupDue(now), 0, 'six days in: not yet');
store.meta().firstUsedAt = now - 9 * DAY;
assert.equal(store.backupDue(now), 9, 'nine days with no backup: due, and says how long');

store.snoozeBackup(1);
assert.equal(lastSaveEvent.saveFailed, true, 'a refused save is reported to listeners');
assert.equal(store.backupDue(now), 0, 'snoozed until tomorrow');
assert.equal(store.backupDue(now + 2 * DAY), 11, 'back after the snooze');

store.markBackedUp();
assert.equal(lastSaveEvent.saveFailed, false, 'the failure is reported once, not on every save');
assert.equal(store.backupDue(), 0, 'just backed up');
assert.equal(store.backupDue(Date.now() + 8 * DAY), 8, 'due again a week after the last backup');
console.log('backup: all checks pass');

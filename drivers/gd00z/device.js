'use strict';

const { ZwaveDevice } = require('homey-zwavedriver');

// Barrier Operator command values (Z-Wave spec, COMMAND_CLASS_BARRIER_OPERATOR 0x66)
const TARGET_CLOSE = 0x00;
const TARGET_OPEN = 0xFF;

const STATE_CLOSED = 0x00;
const STATE_CLOSING = 0xFC;
const STATE_STOPPED = 0xFD;
const STATE_OPENING = 0xFE;
const STATE_OPEN = 0xFF;

// Access Control notification events sent by the GD00Z
const PROBLEM_EVENTS = [65, 66, 67, 68, 69, 71, 72, 74];
const SENSOR_LOW_BATTERY_EVENT = 73;

/**
 * Turns a Barrier Operator "State" field into a number, whatever form Homey hands it over in
 * (number, Buffer, or a parsed text label).
 */
function stateToNumber(raw) {
  if (typeof raw === 'number') return raw;
  if (Buffer.isBuffer(raw)) return raw.length ? raw[0] : null;
  if (typeof raw === 'string') {
    const s = raw.toLowerCase();
    if (s.includes('closing')) return STATE_CLOSING;
    if (s.includes('opening')) return STATE_OPENING;
    if (s.includes('stopped')) return STATE_STOPPED;
    if (s.includes('closed')) return STATE_CLOSED;
    if (s.includes('open')) return STATE_OPEN;
  }
  return null;
}

class GD00ZDevice extends ZwaveDevice {

  async onNodeInit() {
    this.enableDebug();
    this.printNode();

    this.registerCapability('garagedoor_closed', 'BARRIER_OPERATOR', {
      get: 'BARRIER_OPERATOR_GET',
      getOpts: { getOnStart: true, getOnOnline: true },
      report: 'BARRIER_OPERATOR_REPORT',
      reportParser: report => this._parseBarrierReport(report),
    });

    this.registerReportListener('NOTIFICATION', 'NOTIFICATION_REPORT', report => {
      this._onNotification(report).catch(err => this.error('Notification handling failed', err));
    });

    // The opener does not always push a final report, so ask for its state after a move.
    this.registerCapabilityListener('garagedoor_closed', async closed => {
      await this._sendTarget(closed);
      this._scheduleRefresh();
    });
  }

  async _sendTarget(closed) {
    const cc = this.node.CommandClass.COMMAND_CLASS_BARRIER_OPERATOR;
    if (!cc) throw new Error('This device does not expose the Barrier Operator command class. Re-pair it securely.');
    const value = closed ? TARGET_CLOSE : TARGET_OPEN;
    try {
      await cc.BARRIER_OPERATOR_SET({ 'Target Value': value });
    } catch (err) {
      this.log('Numeric Target Value rejected, retrying as raw byte', err.message);
      await cc.BARRIER_OPERATOR_SET({ 'Target Value': Buffer.from([value]) });
    }
  }

  _scheduleRefresh() {
    // The GD00Z flashes and beeps for about 5 seconds before moving, then needs ~15 seconds to travel.
    [10, 25, 45].forEach(seconds => {
      this.homey.setTimeout(() => {
        const cc = this.node.CommandClass.COMMAND_CLASS_BARRIER_OPERATOR;
        if (!cc) return;
        cc.BARRIER_OPERATOR_GET()
          .then(report => {
            const value = this._parseBarrierReport(report);
            if (value !== null) return this.setCapabilityValue('garagedoor_closed', value);
            return null;
          })
          .catch(err => this.error('State refresh failed', err.message));
      }, seconds * 1000);
    });
  }

  _parseBarrierReport(report) {
    if (!report) return null;
    const state = stateToNumber(report.State !== undefined ? report.State : report['State (Raw)']);
    this.log('Barrier state', report.State, '->', state);

    if (state === STATE_CLOSED) return true;
    if (state === STATE_OPEN || state === STATE_OPENING) return false;
    if (state !== null && state >= 0x01 && state <= 0x63) return false; // partly open
    return null; // closing / stopped / unknown: keep the last known value
  }

  async _onNotification(report) {
    if (!report) return;
    const event = typeof report.Event === 'number' ? report.Event : null;
    const parsed = String(report['Event (Parsed)'] || '');
    this.log('Notification', report['Notification Type'], event, parsed);

    if (event === SENSOR_LOW_BATTERY_EVENT || parsed.includes('Low Battery')) {
      await this.setCapabilityValue('alarm_battery', true);
      return;
    }
    if (PROBLEM_EVENTS.includes(event) || /Barrier (Operation|motor|operation|Unattended|failed|Safety|Sensor Not|detected short)/.test(parsed)) {
      await this.setCapabilityValue('alarm_generic', true);
      return;
    }
    if (event === 0 || parsed === 'Event inactive') {
      await this.setCapabilityValue('alarm_generic', false);
      await this.setCapabilityValue('alarm_battery', false);
    }
  }

}

module.exports = GD00ZDevice;

'use strict';

const Homey = require('homey');

class GoControlGarageApp extends Homey.App {
  async onInit() {
    this.log('GoControl Garage Door app started');
  }
}

module.exports = GoControlGarageApp;

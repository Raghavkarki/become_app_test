const { expect } = require('chai');
const Harness = require('cht-conf-test-harness');
const harness = new Harness();
const MARRIED_WOMAN_REPRODUCTIVE_FORM = 'married_woman_reproductive';
const PREGNANCY_HOME_VISIT_FORM = 'pregnancy_home_visit';
const HOUSEHOLD_SURVEY_FORM = 'household_survey';
const REPORT_PURGE_DAYS = 7;
const PURGE_USER = 'chn';
const NOT_PURGED_USER = 'chw';

const { today, marriedWomanReproductive, pregnancyHomeVisit, householdSurveyScenarios } = require('./form-inputs');

const { fn: purgeFn } = require('../purge');
const purge = (role, reports) => purgeFn({ roles: [role] }, {}, reports);

describe('purging', () => {
  before(async () => { return await harness.start(); });
  after(async () => { return await harness.stop(); });
  beforeEach(async () => {
    await harness.clear();
    await harness.setNow(today);
  });
  afterEach(() => {
    expect(harness.consoleErrors).to.be.empty;
  });

  it(`${MARRIED_WOMAN_REPRODUCTIVE_FORM} is purged for ${PURGE_USER} only after ${REPORT_PURGE_DAYS} days.`, async () => {
    const { report: mwrfReport } = await harness.fillForm(MARRIED_WOMAN_REPRODUCTIVE_FORM, ...marriedWomanReproductive.miscarried);

    // is not purged on day 0
    expect(purge(PURGE_USER, [mwrfReport])).to.be.empty;

    // is not purged on day 6
    await harness.setNow(today.plus({ day: 6 }));
    expect(purge(PURGE_USER, [mwrfReport])).to.be.empty;

    // is purged on day 7
    await harness.setNow(today.plus({ day: REPORT_PURGE_DAYS }));
    expect(purge(PURGE_USER, [mwrfReport])).to.deep.eq([mwrfReport._id]);
  });

  it(`${HOUSEHOLD_SURVEY_FORM} is purged for ${PURGE_USER} only after ${REPORT_PURGE_DAYS} days.`, async () => {
    const { report: hhsurveyForm } = await harness.fillForm(HOUSEHOLD_SURVEY_FORM, ...householdSurveyScenarios.deathOptions(today.minus({ day: 1 })));

    // is not purged on day 0
    expect(purge(PURGE_USER, [hhsurveyForm])).to.be.empty;

    // is not purged on day 5
    await harness.setNow(today.plus({ day: 5 }));
    expect(purge(PURGE_USER, [hhsurveyForm])).to.be.empty;

    // is purged on day  7
    await harness.setNow(today.plus({ day: REPORT_PURGE_DAYS }));
    expect(purge(PURGE_USER, [hhsurveyForm])).to.deep.eq([hhsurveyForm._id]);
  });



  it(`${MARRIED_WOMAN_REPRODUCTIVE_FORM} is not purged for ${NOT_PURGED_USER} even after ${REPORT_PURGE_DAYS} days.`, async () => {
    const { report: mwrfReport } = await harness.fillForm(MARRIED_WOMAN_REPRODUCTIVE_FORM, ...marriedWomanReproductive.miscarried);

    // is not purged on day 0
    expect(purge(NOT_PURGED_USER, [mwrfReport])).to.be.empty;

    // is not purged on day 5
    await harness.setNow(today.plus({ day: 5 }));
    expect(purge(NOT_PURGED_USER, [mwrfReport])).to.be.empty;

    // is not purged on day  7
    await harness.setNow(today.plus({ day: REPORT_PURGE_DAYS }));
    expect(purge(NOT_PURGED_USER, [mwrfReport])).to.be.empty;
  });
  it(`${PREGNANCY_HOME_VISIT_FORM} is not purged for any user even after ${REPORT_PURGE_DAYS} days.`, async () => {
    const { report: phvfReport } = await harness.fillForm(PREGNANCY_HOME_VISIT_FORM, ...pregnancyHomeVisit.noService('migrated', 'clear_this'));

    // is not purged on day  7 for chn
    await harness.setNow(today.plus({ day: REPORT_PURGE_DAYS }));
    expect(purge(PURGE_USER, [phvfReport])).to.be.empty;

    // is not purged on day 7 for chw
    expect(purge(NOT_PURGED_USER, [phvfReport])).to.be.empty;

  });

  it(`combination of ${PREGNANCY_HOME_VISIT_FORM} and ${HOUSEHOLD_SURVEY_FORM}, only ${HOUSEHOLD_SURVEY_FORM} is perged.`, async () => {
    const { report: phvfReport } = await harness.fillForm(PREGNANCY_HOME_VISIT_FORM, ...pregnancyHomeVisit.noService('migrated', 'clear_this'));
    const { report: hhsurveyForm } = await harness.fillForm(HOUSEHOLD_SURVEY_FORM, ...householdSurveyScenarios.deathOptions(today.minus({ day: 1 })));
    await harness.setNow(today.plus({ day: REPORT_PURGE_DAYS }));
    const purged = purge(PURGE_USER, [phvfReport, hhsurveyForm]);
    expect(purged.length).to.equal(1);
    expect(purged.includes(hhsurveyForm._id)).to.be.true;
    expect(purged.includes(phvfReport._id)).to.be.false;
  });
});

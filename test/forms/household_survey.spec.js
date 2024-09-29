const { expect } = require('chai');
const TestRunner = require('cht-conf-test-harness');
const { householdSurveyScenarios, today } = require('../form-inputs');
const harness = new TestRunner();
const HOUSEHOLD_SURVEY_FORM = 'household_survey';

describe('Household survey form tests', () => {
  before(async () => { return await harness.start(); });
  after(async () => { return await harness.stop(); });

  beforeEach(
    async () => {
      await harness.clear();
      await harness.setNow(today);
    });

  afterEach(() => {
    expect(harness.consoleErrors).to.be.empty;
  });

  ['yes', 'no'].forEach(choice => {
    const insuranceChoices = choice === 'yes' ? [['government', 'yes'], ['government', 'no', 3]] : [''];
    insuranceChoices.forEach(insuranceChoice => {
      it(`Should fill ${HOUSEHOLD_SURVEY_FORM} form for insurance: ${choice} and insured all: ${insuranceChoice[1] || 'none'}`, async () => {
        const result = await harness.fillForm(HOUSEHOLD_SURVEY_FORM, ...householdSurveyScenarios.simple(choice, insuranceChoice));
        expect(result.errors).to.be.empty;
      });
    });
  });

  it(`Past date of death should not throw error.`, async () => {
    const result = await harness.fillForm(HOUSEHOLD_SURVEY_FORM, ...householdSurveyScenarios.deathOptions(today.minus({ day: 1 })));
    expect(result.errors).to.be.empty;
  });


  it(`Future date of death should throw error.`, async () => {
    const result = await harness.fillForm(HOUSEHOLD_SURVEY_FORM, ...householdSurveyScenarios.deathOptions(today.plus({ day: 1 })));
    expect(result.errors.length).to.eq(1);
    expect(result.errors[0].msg).to.eq('Date of death can not be in the future.');
  });

});

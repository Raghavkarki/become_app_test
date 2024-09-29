const { expect } = require('chai');
const Harness = require('cht-conf-test-harness');
const {
  cervicalCancer: {
    screeningDateFuture,
    screeningDateCorrect,
    viaPositive,
    viaPositiveFacility,
    viaPositiveOtherReason
  },
  today
} = require('../form-inputs');
const harness = new Harness();

const CERVICAL_CANCER_FORM = 'cervical_cancer_screening';

describe('Cervical cancer screening form tests', () => {
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

  it(`Future screening date must throw validation error.`, async () => {
    const result = await harness.fillForm(CERVICAL_CANCER_FORM, ...screeningDateFuture);  
    const futureDateError = result.errors.find(error => error.msg === 'Date should not be in future');    
    expect(futureDateError, `Expected 'Date should not be in future' validation error, but got: ${JSON.stringify(result.errors)}`).to.exist;
  });

  it(`Correct screening date should not throw error.`, async () => {
    const result = await harness.fillForm(CERVICAL_CANCER_FORM, ...screeningDateCorrect);
    expect(result.errors.length).to.eq(0);
  });

  it('Checking field display conditions on via positive', async () => {
    const result = await harness.fillForm(CERVICAL_CANCER_FORM, ...viaPositive);
    expect(result.errors.length).to.eq(0);
  });

  it('Checking facility not visited fields display conditions on via positive', async () => {
    const result = await harness.fillForm(CERVICAL_CANCER_FORM, ...viaPositiveFacility);
    expect(result.errors.length).to.eq(0);
  });

  it('Checking open text field displayed on facility not visited with other reasons', async () => {
    const result = await harness.fillForm(CERVICAL_CANCER_FORM, ...viaPositiveOtherReason);
    expect(result.errors.length).to.eq(0);
  });
});

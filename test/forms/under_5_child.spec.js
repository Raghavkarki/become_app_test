const { expect } = require('chai');
const TestRunner = require('cht-conf-test-harness');
const { today, under_5_child } = require('../form-inputs');
const harness = new TestRunner();
const UNDER_5_CHILD_FORM = 'under_5_child';

describe(`${UNDER_5_CHILD_FORM} form tests.`, () => {
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

  it(`vitamin a question is asked for child without vaccine cards.`, async () => {
    const result = await harness.fillForm(UNDER_5_CHILD_FORM, ...under_5_child.no_vaccine_card);
    expect(result.errors).to.be.empty;
  });

  it(`vitamin a question is asked for child with vaccine cards.`, async () => {
    const result = await harness.fillForm(UNDER_5_CHILD_FORM, ...under_5_child.vaccine_card);
    expect(result.errors).to.be.empty;
  });
});

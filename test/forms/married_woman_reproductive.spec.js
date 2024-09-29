const { expect } = require('chai');
const TestRunner = require('cht-conf-test-harness');
const { today, marriedWomanReproductive } = require('../form-inputs');
const harness = new TestRunner();
const MARRIED_WOMAN_REPRODUCTIVE_FORM = 'married_woman_reproductive';
const NO_FP_USE_REASONS = [
  'another_baby_soon',
  'irregular_intercourse',
  'husband_abroad',
  'widowed',
  'no_menstruation',
  'breastfeeding',
  'god_will',
  'women_disagreement',
  'husband_disagreement',
  'others_disagree',
  'not_knowing_method',
  'not_knowing_place',
  'side_effects',
  'too_far',
  'hysterectomy',
  'other'
];

describe(`${MARRIED_WOMAN_REPRODUCTIVE_FORM} form tests.`, () => {
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

  NO_FP_USE_REASONS.forEach(reason => {
    it(`Test for woman who is not using FP because of ${reason}`, async () => {
      const result = await harness.fillForm(MARRIED_WOMAN_REPRODUCTIVE_FORM, ...marriedWomanReproductive.notUsingFP(reason));
      expect(result.errors).to.be.empty;
    });
  });

  it(`Test for woman who was pregnant but miscarried.`, async () => {
    const result = await harness.fillForm(MARRIED_WOMAN_REPRODUCTIVE_FORM, ...marriedWomanReproductive.miscarried);
    expect(result.errors).to.be.empty;
  });

  it(`Test for woman who was pregnant and delivered.`, async () => {
    const result = await harness.fillForm(MARRIED_WOMAN_REPRODUCTIVE_FORM, ...marriedWomanReproductive.pregantWithLiveOutcome);
    expect(result.errors).to.be.empty;
  });

  it(`Test for baby who is not on brestfeed and is having food.`, async () => {
    const result = await harness.fillForm(MARRIED_WOMAN_REPRODUCTIVE_FORM, ...marriedWomanReproductive.babyNotBreastFeeding);
    expect(result.errors).to.be.empty;
  });

  [1, 2, 3, 4].forEach(babyBorn => {
    it(`Test for repeat with ${babyBorn} baby`, async () => {
      const result = await harness.fillForm(MARRIED_WOMAN_REPRODUCTIVE_FORM, ...marriedWomanReproductive.multipleBabies(babyBorn));
      expect(result.errors).to.be.empty;
    });
  });

});

const { expect } = require('chai');
const Harness = require('cht-conf-test-harness');
const {
  today,
  childHealth: {
    screening
  }
} = require('../form-inputs');
const harness = new Harness();

const CHILD_HEALTH_SCREENING = 'child_health_screening';

screening.forEach(({childAgeGroup, dateOfBirth, constraints}) => {
  describe(`Child Health form tests for child ${childAgeGroup}`, () => {
    const {
      base,
      cases
    } = constraints;

    before(async () => await harness.start());
    after(async () => await harness.stop());
  
    beforeEach(async () => {
      await harness.clear();
      await harness.setNow(today);
      harness.subject.date_of_birth = dateOfBirth;
    });
  
    afterEach(() => {
      expect(harness.consoleErrors).to.be.empty;
    });
  
    cases.forEach(([field, messages, range, position]) => {
      range.forEach((value) => {
        it(`Checking validation for ${field} with value ${value}`, async () => {
          const input = JSON.parse(JSON.stringify(base));
          input[0][position] = value;

          const result = await harness.fillForm(CHILD_HEALTH_SCREENING, ...input);
          expect(result.errors.length).to.eq(messages.length);
          expect(result.errors.reduce((acc, {msg}) => acc + msg, '')).to.eq(messages.join(''));
        });
      });
    });
  });
});

const { expect } = require('chai');
const Harness = require('cht-conf-test-harness');
const { 
  today,
  childHealth: {
    screening,
    followup
  }
} = require('../form-inputs');
const harness = new Harness();

const CHILD_HEALTH_SCREENING = 'child_health_screening';
const CHILD_REFERRAL_FOLLOWUP_TASK = 'task.child_health.referral_followup';

screening.forEach(({childAgeGroup, dateOfBirth, triggers, noTriggers}) => {
  describe(`Child Health task generation tests for child ${childAgeGroup}`, () => {
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

    [
      ['Confirming no task trigger on', noTriggers],
      ['Checking task trigger on danger sign', triggers]
    ].forEach(([title, caseList], expectedTaskCount) => {
      caseList.forEach(({sign, input}) => {
        it(`${title} ${sign}`, async () => {
          const result = await harness.fillForm(CHILD_HEALTH_SCREENING, ...input);
          expect(result.errors).to.be.empty;
    
          await harness.flush({ days: 7 });
          const tasks = await harness.getTasks({ title: CHILD_REFERRAL_FOLLOWUP_TASK });
          
          expect(tasks.length).to.equal(expectedTaskCount);
        });
      });
    });
  }); 
});

describe('Child health referral followup task tests', () => {
  const {
    dateOfBirth,
    starter,
    triggers,
    noTriggers
  } = followup;
  
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

  [
    [2, 11],
    [3, 10]
  ].forEach((limits, expectedTaskCount) => {
    limits.forEach((days) => {
      it(`Checking if task displayed in ${days} days`, async () => {
        const result = await harness.fillForm(CHILD_HEALTH_SCREENING, ...starter);
        expect(result.errors).to.be.empty;
    
        await harness.flush({ days });
        const tasks = await harness.getTasks({ title: CHILD_REFERRAL_FOLLOWUP_TASK });
        expect(tasks.length).to.equal(expectedTaskCount);
      });
    });
  });

  [
    ['Confirming no task trigger on followup', noTriggers],
    ['Checking subsequent task trigger on followup danger sign', triggers]
  ].forEach(([title, caseList], expectedTaskCount) => {
    caseList.forEach(({sign, input}) => {
      it(`${title} ${sign}`, async () => {
        let result = await harness.fillForm(CHILD_HEALTH_SCREENING, ...starter);
        expect(result.errors).to.be.empty;
  
        await harness.flush({ days: 7 });
        let tasks = await harness.getTasks({ title: CHILD_REFERRAL_FOLLOWUP_TASK });
        expect(tasks.length).to.equal(1);
  
        result = await harness.loadAction(tasks[0], ...input);
        expect(result.errors).to.be.empty;
  
        await harness.flush({ days: 7 });
        tasks = await harness.getTasks({ title: CHILD_REFERRAL_FOLLOWUP_TASK });
        expect(tasks.length).to.equal(expectedTaskCount);
      });
    });
  });
});

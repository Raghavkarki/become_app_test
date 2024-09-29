const { expect } = require('chai');
const TestRunner = require('cht-conf-test-harness');
const {
  pregnancy: { newlyPregnant },
  today,
  ancSchedule,
  pregnancyHomeVisit: { normal: pregnancyHomeVisitNormal }
} = require('../form-inputs');
const PREGNANCY_REGISTRATION = 'pregnancy';
const harness = new TestRunner();
const PREGNANCY_HOME_VISIT_TASK_TITLE = 'task.anc.pregnancy_home_visit.title';

describe('ANC Home visit task tests', () => {
  before(async () => await harness.start());
  after(async () => await harness.stop());

  beforeEach(
    async () => {
      await harness.clear();
      await harness.setNow(today);
    }
  );

  afterEach(() => {
    expect(harness.consoleErrors).to.be.empty;
  });

  ancSchedule.forEach((dueDay) => {
    // Since 84 days skipped in registration form
    const days = dueDay - 84;
    const conditionalQuestionCount = ((currentInWeeks) => {
      if (currentInWeeks >= 16 && currentInWeeks <= 36) {
        return currentInWeeks >= 31 ? 8 : 7;
      } else {
        return 2;
      }
    })(dueDay / 7);

    it(`Ensuring ANC Visit tasks displays in ${dueDay} days`, async () => {
      let result = await harness.fillForm(
        PREGNANCY_REGISTRATION,
        ...newlyPregnant
      );
      expect(result.errors).to.be.empty;

      // Testing the ANC task appears as designed
      await harness.flush({ days });
      let tasks = await harness.getTasks({ title: PREGNANCY_HOME_VISIT_TASK_TITLE });
      expect(tasks.length).to.equal(1);

      // Testing ANC task resolution
      result = await harness.loadAction(tasks[0], ...pregnancyHomeVisitNormal(days + 84, conditionalQuestionCount));
      expect(result.errors).to.be.empty;
      tasks = await harness.getTasks({ title: PREGNANCY_HOME_VISIT_TASK_TITLE });
      expect(tasks.length).to.equal(0);
    });
  });
});

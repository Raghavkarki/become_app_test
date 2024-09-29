const { expect } = require('chai');
const Harness = require('cht-conf-test-harness');
const {
  today,
  mentalHealth: {
    behavioralSigns,
    depressionSigns,
    suicidalSigns,
    anxietySigns,
    epilepsyOrOtherSigns,
    noTriggerOnNone,
    noTriggerOnDifferentGroups,
    examined,
    notExamined
  }
} = require('../form-inputs');
const harness = new Harness();

const MENTAL_HEALTH_FORM = 'mental_health_screening';
const MENTAL_HEALTH_TASK = 'task.mental_health.mental_health_referral_followup';

describe('Mental health tasks generation tests', () => {
  before(async () => await harness.start());
  after(async () => await harness.stop());

  beforeEach(async () => {
    await harness.clear();
    await harness.setNow(today);
  });

  afterEach(() => {
    expect(harness.consoleErrors).to.be.empty;
  });

  [ // Testing followup task generation conditions
    [
      [noTriggerOnNone, 'Testing task not generated on none'],
      [noTriggerOnDifferentGroups, 'Testing task not generated when danger threshold is not crossed']
    ],
    [
      [behavioralSigns, 'Testing task generation for on behavior signs [powerful_person, talk_unnecessary, ...] group'],
      [depressionSigns, 'Testing task generation for on depression signs [loss_of_interest_in_work, insomnia, ...] group'],
      [suicidalSigns, 'Testing task generation for on suicidal signs [suicidal_thoughts, weak_and_helpless] group'],
      [anxietySigns, 'Testing task generation for on anxiety signs [stress_feeling, anxiety_heart_palpitations, rude, ...] group'],
      [epilepsyOrOtherSigns, 'Testing task generation for on epilepsy or other signs [convulsion_and_froathing, other_signs_and_symptoms, ...] group']
    ]
  ].forEach((triggerGroup, expectedTaskCount) => {
    triggerGroup.forEach(([formData, title]) => {
      it(title, async () => {
        const result = await harness.fillForm(MENTAL_HEALTH_FORM, ...formData);
        expect(result.errors).to.be.empty;
    
        await harness.flush({ days: 21 });
        const tasks = await harness.getTasks({ title: MENTAL_HEALTH_TASK });
        expect(tasks.length).to.equal(expectedTaskCount);
      });
    });
  });

  [ // Testing subsequent followup generation
    [examined, 'Testing mental health followup task resolution'],
    [notExamined, 'Testing subsequent mental health followup task generation']
  ].forEach(([taskTriggerGroup, title], subsequentFollowupCount) => {
    it(title, async () => {
      let result = await harness.fillForm(MENTAL_HEALTH_FORM, ...behavioralSigns);
      expect(result.errors).to.be.empty;
  
      await harness.flush({ days: 21 });
      let tasks = await harness.getTasks({ title: MENTAL_HEALTH_TASK });
      expect(tasks.length).to.equal(1);
  
      result = await harness.loadAction(tasks[0], ...taskTriggerGroup);
      expect(result.errors).to.be.empty;
  
      await harness.flush({  days: 21 });
      tasks = await harness.getTasks({ title: MENTAL_HEALTH_TASK });
      expect(tasks.length).to.equal(subsequentFollowupCount);
    });
  });

  [ // Testing start and end dates for followup tasks
    [[13, 0, 1], [
      'Testing mental health followup task start date',
      'Testing subsequent mental health followup task start date'
    ]],
    [[28, 1, 0], [
      'Testing mental health followup task end date',
      'Testing subsequent mental health followup task end date'
    ]]
  ].forEach(([
    [days, initialCheckCount, flushedCheckCount], 
    [followupTitle, subsequentFollowupTitle]
  ]) => {
    const followupCheck = (extraFollowup) => (async () => {
      const result = await harness.fillForm(MENTAL_HEALTH_FORM, ...behavioralSigns);
      expect(result.errors).to.be.empty;

      extraFollowup && await extraFollowup();

      await harness.flush({ days });
      let tasks = await harness.getTasks({ title: MENTAL_HEALTH_TASK });
      expect(tasks.length).to.equal(initialCheckCount);

      await harness.flush({ days: 1 });
      tasks = await harness.getTasks({ title: MENTAL_HEALTH_TASK });
      expect(tasks.length).to.equal(flushedCheckCount);
    });

    it(followupTitle, followupCheck());

    it(subsequentFollowupTitle, followupCheck(async () => {
      await harness.flush({ days: 21 });
      const tasks = await harness.getTasks({ title: MENTAL_HEALTH_TASK });
      expect(tasks.length).to.equal(1);
  
      const result = await harness.loadAction(tasks[0], ...notExamined);
      expect(result.errors).to.be.empty;
    }));
  });
});

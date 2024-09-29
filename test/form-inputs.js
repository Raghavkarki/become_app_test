const { DateTime } = require('luxon');
const today = DateTime.fromISO('2022-12-21', { zone: 'utc' });
const MARRIED_WOMAN_REPRODUCTIVE_DELIVERY = ['yes', 'no', '1_visited', 'no', today.minus({ months: 3 }), 'home', 'doctor'];
const UNDER_5_NORMAL_DELIVERY = ['normal', 'week_37_40', '3', 'no', 'no'];
const UNDER_5_CHILD_NORMAL_MEASURES = ['50', '25', '25'];
const HOUSEHOLD_FORM_LONG_PAGE = [
  ['agree'],
  [
    'mud', 'rented', 'piped', 'piped', 'piped', 'yes', 'boil',
    'flush_drain', '10', 'yes', 'open', 'open', 'kitchen_garden',
    'open', 'electricity', 'yes', 'yes', '1', 'no', 'no'
  ]
];
module.exports = {
  today,
  ancSchedule: [84, 112, 168, 196, 224, 238, 252, 280],
  pncSchedule: [3, 14, 42],
  householdSurveyScenarios: {
    simple: (health_insurance, insuranceChoices) => [
      ...HOUSEHOLD_FORM_LONG_PAGE,
      [health_insurance, ...insuranceChoices, 'less_than_30min'],
      ['no'],
      ['no']
    ],
    deathOptions: (dateOfDeath) => [
      ...HOUSEHOLD_FORM_LONG_PAGE,
      ['no', 'less_than_30min'],
      ['yes', '1', '10', '0', '0', '0', 'male', dateOfDeath, 'home', 'some', 'no'],
      ['no']
    ]
  },
  pregnancyHomeVisit: {
    noService: (reason, nextOption) => [
      [reason],
      [nextOption]
    ],
    interrupted: (reason, date) => [
      [reason],
      [date]
    ],
    normal: (daysSinceLMP, conditionalQuestions) => [
      ['yes'],
      ['yes'],
      ['yes', 'no'],
      ['none', 'no'],
      ...(daysSinceLMP < 280 ? [['yes']] : []),
      Array(9).fill('no'),
      ...Array(conditionalQuestions).fill(['no']),
      [],
      []
    ]
  },
  marriedWomanReproductive: {
    notUsingFP: (noFpReason) => [
      ['no'],
      ['no', noFpReason, ...[noFpReason === 'other' ? noFpReason : null].filter(item => item)]
    ],
    miscarried: [
      ['yes', 'yes', '6', 'self', 'no'],
      ['no', 'other', 'other']
    ],
    pregantWithLiveOutcome: [
      [...MARRIED_WOMAN_REPRODUCTIVE_DELIVERY, '1', 'female', 'live_born', 'normal', 'no', 'yes', 'within_1hr', 'still_feeding', 'no'],
      ['no', 'too_far']
    ],
    babyNotBreastFeeding: [
      [...MARRIED_WOMAN_REPRODUCTIVE_DELIVERY, '1', 'female', 'live_born', 'normal', 'no', 'yes', 'within_1hr', 'less_than_6mth', '5', 'no'],
      ['no', 'too_far']
    ],
    multipleBabies: (noOfBaby) => [
      [...MARRIED_WOMAN_REPRODUCTIVE_DELIVERY, noOfBaby, Array(noOfBaby).fill(['male', 'died_born']).flat(), 'no'].flat(),
      ['no', 'too_far']
    ]
  },
  under_5_child: {
    no_vaccine_card: [
      UNDER_5_NORMAL_DELIVERY,
      ['no'],
      ['no', 'no'],
      UNDER_5_CHILD_NORMAL_MEASURES
    ],
    vaccine_card: [
      UNDER_5_NORMAL_DELIVERY,
      ['yes'].concat(Array(16).fill('vaccinated')).concat(['no']),
      ['no', 'no'],
      UNDER_5_CHILD_NORMAL_MEASURES
    ]
  },
  breastCancer: {
    BC_followup_input: [
      [],
      ['no'],
      [],
      ['no'],
      ['yes', 'yes', 'swollen_lump'],
      []
    ],
    BC_Normal_Condition: [
      [],
      ['no'],
      [],
      ['no'],
      ['yes', 'yes', 'none'],
      []
    ],
    BC_Date_5_Yrs_Plus: [
      [],
      ['yes'],
      [],
      ['yes'],
      [today.minus({ years: 50, days: 1 }), 'usg', 'positive'],
      []
    ],
    BC_Date_Less_Than_5_Yrs: [
      [],
      ['yes'],
      [],
      ['yes'],
      today.minus({ years: 4 }),
      ['something happened', 'yes', 'yes', 'none'],
      []
    ],
    BC_tomorrow_date: [
      [],
      ['yes'],
      [],
      ['yes'],
      [today.plus({ days: 1 }), 'usg', 'positive'],
      []
    ],
    BC_followup_followup: [
      ['no', 'forgot']
    ],
    BC_Followup_No_Cancer: [
      ['yes', 'no']
    ],
    BC_Followup_Hf_treatment: [
      ['yes'],
      ['yes'],
      ['text message'],
      ['no'],
      [],
      ['no'],
      []
    ]
  },
  pregnancy: {
    eightMonthPregnant: [
      [today.minus({ days: 238 })],
      [],
      [0],
      [],
      ['no', 'no'],
      ['none'],
      Array(9).fill('no'),
      ['yes'],
      ['yes'],
      Array(7).fill('yes'),
      []
    ],
    newlyPregnant: [
      [today.minus({ days: 84 })],
      [],
      [0],
      [],
      ['yes', 'no'],
      ['none'],
      Array(9).fill('no'),
      ['yes'],
      ['yes'],
      Array(3).fill('yes'),
      [],
    ],
    givenLMP(date) {
      return [
        [date],
        [],
        [0],
        [],
        ['yes', 'no'],
        ['none'],
        Array(9).fill('no'),
        ['yes'],
        ['yes'],
        []
      ];
    }
  },
  pregnancySurveillance: {
    iucd_used: [
      ['yes', 'no'],
      ['yes', 'temporary', 'iucd', today, 'severe_abdominal_pain']
    ],
    implant_symptoms: [
      ['yes', 'no'],
      ['yes', 'temporary', 'implant', today, 'health_problem']
    ],
    depo_conditions: [
      ['yes', 'no'],
      ['yes', 'temporary', 'depo', today, 'high_bloodflow_problem']
    ],
    pills_conditions: [
      ['yes', 'no'],
      ['yes', 'temporary', 'pills', 'breast_cancer']
    ],
    balanced_counseling: [
      ['yes', 'no'],
      ['yes', 'natural', 'natural_safe_calender'],
      ['yes', 'yes', 'breastfeeding_ways']
    ]
  },
  familyPlanning: {
    iucd_used: [
      ['yes', 'no']
    ],
    implant_symptoms: [
      ['yes', 'no']
    ],
    depo_conditions: [
      ['yes', 'no']
    ],
    pills_conditions: [
      ['yes', 'no']
    ],
    balanced_counseling: [
      ['condom']
    ]
  },
  delivery: {
    deadDelivery: (dateOfDelivery = today) => [
      [dateOfDelivery, 'public_health_facility', 'normal'],
      ['death', today, 'health_facility', 'no', 'prolonged_labour'],
      ['0'],
      []
    ],
    normalDelivery: (dateOfDelivery = today) => [
      [dateOfDelivery, 'public_health_facility', 'normal'],
      ['healthy'].concat(Array(9).fill('no')),
      ['1', 'healthy', 'Baby 1', 'male', ...Array(11).fill('no')],
      ['0'],
      []
    ],
    normalDeliveryCS: (dateOfDelivery = today) => [
      [dateOfDelivery, 'public_health_facility', 'cesarean_section'],
      ['healthy'].concat(Array(10).fill('no')),
      ['1', 'healthy', 'Baby 1', 'male', ...Array(11).fill('no')],
      ['0'],
      []
    ]
  },
  mentalHealth: {
    screening: [
      [['powerful_person', 'talk_unnecessary']]
    ],
    notExamined: [
      ['no', 'other_reasons', 'test']
    ],
    examined: [
      ['yes', 'depression']
    ],
    diagnosedOther: [
      ['yes', 'others', 'test']
    ],
    behavioralSigns: [
      [['powerful_person', 'talk_unnecessary']]
    ],
    depressionSigns: [
      [['loss_of_interest_in_work', 'insomnia']]
    ],
    suicidalSigns: [
      ['weak_and_helpless']
    ],
    anxietySigns: [
      [['no_health_issue', 'stress_feeling']]
    ],
    epilepsyOrOtherSigns: [
      ['convulsion_and_froathing']
    ],
    noTriggerOnNone: [
      ['none']
    ],
    noTriggerOnDifferentGroups: [
      ['powerful_person, insomnia, rude']
    ]
  },
  cervicalCancer: {
    followup: (apply = false) => [
      !apply ? ['yes', 'no'] : ['no', 'forget']
    ],
    screeningDateFuture: [
      ['yes', 'yes', today.plus({ days: 32 }), 'via_test', 'negative']
    ],
    screeningDateCorrect: [
      ['yes', 'yes', `${today.year}-${today.month}`, 'via_test', 'negative']
    ],
    taskTrigger: [
      ['yes', 'no'],
    ],
    viaPositive: [
      ['yes', 'yes', `${today.year}-${today.month}`, 'via_test', 'positive', 'yes', 'yes']
    ],
    viaPositiveFacility: [
      ['yes', 'yes', `${today.year}-${today.month}`, 'via_test', 'positive', 'no', 'forgot']
    ],
    viaPositiveOtherReason: [
      ['yes', 'yes', `${today.year}-${today.month}`, 'via_test', 'positive', 'no', 'other_reasons', 'test']
    ]
  },
  childHealth: {
    screening: [
      {
        childAgeGroup: 'less than two months',
        dateOfBirth: today.minus({ days: 20 }),
        triggers: [
          ...[
            'suck_breast',
            'convulsions_59_days',
            'severe_chest_indrawing',
            'nasal_flaring',
            'bulging_fontanelle',
            'redness_spread',
            'lethargic_unconscious',
            'skin_blisters',
            'pus_discharge_from_eye',
            'jaundice',
            'watery_stool_59days'
          ].map((sign, index) => {
            const [firstHalfSize, offset] = sign === 'jaundice' || sign === 'redness_spread' ? [11, 10] : [10, 9];
            const secondHalfSize = sign === 'watery_stool_59days' ? 5 : 1;

            const data = [...Array(firstHalfSize).fill('no'), 36.5, 50, ...Array(secondHalfSize).fill('no')];
            data[(index <= offset) ? index : index + 2] = 'yes';

            return {
              sign,
              input: [
                data,
                []
              ]
            };
          }),
          ...[
            [37.5, 'fever'],
            [36.4, 'hypothermia']
          ].map(([limit, sign]) => {
            return {
              sign,
              input: [
                [...Array(10).fill('no'), limit, 50, ...Array(1).fill('no')],
                []
              ]
            };
          }),
          {
            sign: 'respiration_rate_high',
            input: [
              [...Array(10).fill('no'), 36.5, 60, ...Array(1).fill('no')],
              []
            ]
          }
        ],
        noTriggers: [
          {
            sign: 'normal_condition',
            input: [
              [...Array(10).fill('no'), 36.5, 50, ...Array(1).fill('no')],
              []
            ]
          }
        ],
        constraints: {
          base: [
            [...Array(10).fill('no'), 36.5, 50, ...Array(1).fill('no')],
            []
          ],
          cases: [
            [
              'respiration',
              ['Accepted value 24 to 100'],
              [23, 101],
              11
            ],
            [
              'temperature',
              ['(Write in Centigrade)', 'Accept value 33.5 to 40'],
              [33.4, 40.1],
              10
            ]
          ]
        }
      },
      {
        childAgeGroup: 'more than two months',
        dateOfBirth: today.minus({ months: 16 }),
        triggers: [
          ...[
            [0, 'unable_to_suck_drink'],
            [1, 'vomit_everything'],
            [2, 'convulsions_2months_5years'],
            [3, 'lethargic_unconscious_2months_5years'],
            [4, 'convulsions_now'],
            [6, 'chest_indrawing'],
            [8, 'stridor'],
            [11, 'stiff_neck'],
            [15, 'swelling_behind_ear']
          ].map(([position, sign]) => {
            const data = [...Array(7).fill('no'), 30, ...Array(2).fill('no'), 37.4, ...Array(3).fill('no'), ['none'], ...Array(2).fill('no'), 12.6, 'no_whiteness'];
            data[position] = 'yes';

            return {
              sign,
              input: [
                data,
                Array(18).fill('no')
              ]
            };
          }),
          {
            sign: 'malnutrition',
            input: [
              [...Array(7).fill('no'), 30, ...Array(2).fill('no'), 37.4, ...Array(3).fill('no'), ['none'], ...Array(2).fill('no'), 12.4, 'no_whiteness'],
              Array(18).fill('no')
            ]
          },
          {
            sign: 'pus_discharge',
            input: [
              [...Array(7).fill('no'), 30, ...Array(2).fill('no'), 37.4, ...Array(3).fill('no'), ['none'], 'no', 'yes', 'yes', 'less_than_14_days', 12.4, 'no_whiteness'],
              Array(18).fill('no')
            ]
          },
          ...[
            'whiteness_with_lines',
            'whiteness_but_no_lines'
          ].map((sign) => {
            return {
              sign,
              input: [
                [...Array(7).fill('no'), 30, ...Array(2).fill('no'), 37.4, ...Array(3).fill('no'), ['none'], ...Array(2).fill('no'), 12.4, sign],
                Array(18).fill('no')
              ]
            };
          }),
          ...[
            ['lethargic', 'sunken_eyes'],
            ['cannot_drink', 'drinks_eagerly', 'abdomen_skin_2sec'],
            ['restless', 'abdomen_skin_slow', 'blood_in_stool', 'sunken_eyes']
          ].map((symptoms) => {
            return {
              sign: symptoms.join(', '),
              input: [
                [...Array(7).fill('no'), 30, ...Array(2).fill('no'), 37.4, ...Array(3).fill('no'), symptoms, ...Array(2).fill('no'), 12.4, 'no_whiteness'],
                Array(18).fill('no')
              ]
            };
          }),
          ...[
            'red_rashes',
            'cough_runnynose_redeyes',
            'wound_in_mouth',
            'blurred_cornea',
            'pus_discharge_eye'
          ].map((sign, position) => {
            const measlesFields = Array(5).fill('no');
            measlesFields[position] = 'yes';
            return {
              sign,
              input: [
                [...Array(7).fill('no'), 30, ...Array(2).fill('no'), 37.4, 'no', 'yes', ...measlesFields, 'no', ['none'], ...Array(2).fill('no'), 12.6, 'no_whiteness'],
                Array(18).fill('no')
              ]
            };
          })
        ],
        noTriggers: [
          {
            sign: 'normal_condition',
            input: [
              [...Array(7).fill('no'), 30, ...Array(2).fill('no'), 37.4, ...Array(3).fill('no'), ['none'], ...Array(2).fill('no'), 12.6, 'no_whiteness'],
              Array(18).fill('no')
            ]
          },
          {
            sign: 'single_symptom',
            input: [
              [...Array(7).fill('no'), 30, ...Array(2).fill('no'), 37.4, ...Array(3).fill('no'), ['drinks_eagerly'], ...Array(2).fill('no'), 12.6, 'no_whiteness'],
              Array(18).fill('no')
            ]
          }
        ],
        constraints: {
          base: [
            [...Array(7).fill('no'), 30, ...Array(2).fill('no'), 37.4, ...Array(3).fill('no'), ['none'], ...Array(2).fill('no'), 12.6, 'no_whiteness'],
            Array(18).fill('no')
          ],
          cases: [
            [
              'muac',
              ['in cm', 'Accepted value 6 to 26.5 cm'],
              [5.9, 26.6],
              17
            ],
            [
              'respiration',
              ['Accepted value 20 to 100'],
              [19, 101],
              7
            ],
            [
              'temperature',
              ['(Write in Centigrade)', 'Accepted value 36.5 to 40'],
              [36.4, 40.1],
              10
            ]
          ]
        }
      }
    ],
    followup: {
      dateOfBirth: today.minus({ days: 20 }),
      starter: [
        ['yes', ...Array(9).fill('no'), 36.5, 50, ...Array(1).fill('no')],
        []
      ],
      triggers: [
        'unable_to_drink_milk',
        'vomit_everything',
        'convulsions',
        'lethargic_or_unconscious',
        'convulsions_now',
        'any_other_danger'
      ].map((sign, position) => {
        const dangerSigns = Array(6).fill('no');
        dangerSigns[position] = 'yes';

        if (sign === 'any_other_danger') {
          dangerSigns.push('test');
        }

        return {
          sign,
          input: [
            ['visiting_myself', 'yes', 'same', ...dangerSigns]
          ]
        };
      }),
      noTriggers: [
        {
          sign: 'normal_condition',
          input: [
            ['visiting_myself', 'yes', 'same', ...Array(6).fill('no')]
          ]
        }
      ]
    }
  },
  pncDangerSignBaby: {
    noDangerSign: [
      ['yes', ...Array(9).fill('no')]
    ],
    oneDangerSign: [
      ['yes', 'yes', ...Array(8).fill('no')]
    ],
    manyDangerSign: [
      [...Array(10).fill('yes')]
    ]
  },
  pncDangerSignMother: {
    noDangerSign: [
      [...Array(10).fill('no')]
    ],
    oneDangerSign: [
      ['yes', 'yes', ...Array(8).fill('no')]
    ],
    manyDangerSign: [
      [...Array(11).fill('yes')]
    ]
  },
  pnc_serive_mother: {
    oneDangerSign: [
      [],
      [],
      [],
      ['yes', ...Array(9).fill('no')], [], []
    ],
    noDangerSign: [
      [...Array(10).fill('no')], [], []
    ]
  },
  pnc_service1: {
    no: [
      [],
      [...Array(10).fill('no')], [...Array(9).fill('no')], []
    ]
  },
  pncService: {
    triggers: [
      'Fever',
      'Excesive vaginal bleeding',
      'Will the body be spasm?',
      'Severe continuous headache or blurred vision',
      'Severe lower abdominal pain',
      'Foul-smelling white discharge from the vagina',
      'Redness of Calf or swollen or difficulty in breathing or chest pain',
      'Difficulty in micturition or leak urine',
      'Do you have mood and emotional swings?',
      'In women who have given birth by surgery, is bleeding at the site of surgery, very painful?'
    ].map((sign, position) => {
      const dangerSigns = Array(10).fill('no');
      dangerSigns[position] = 'yes';

      return {
        sign,
        input: [
          [],
          [...dangerSigns], [...Array(9).fill('no')], []]
      };
    }),
    noTriggers: [
      [],
      [...Array(9).fill('no')], [], []
    ]
  },
  pnc_referral_form: {
    healthcheckupyes: [
      ['in_person', 'cured', 'yes']
    ],
    healthcheckupno: [
      ['in_person', 'cured', 'no']
    ]
  },
  hypertension: {
    triggers: [
      'Blurred vision',
      'Severe headache or mild headache',
      'Is the chest heavy or does it feel like something is pressing on it?',
      'Feel tiredness and shortness of breath.',
      'Swelling of feet and hands?'
    ].map((sign, position) => {
      const dangerSigns = Array(5).fill('no');
      dangerSigns[position] = 'yes';
    
      return {
        sign,
        input: [
          [80, 150, 80, 90, 'no'],[...Array(3).fill('no')],
          [...dangerSigns],[],[]]
      };
    }),
    noTriggers: [
  
      [80, 120, 120, 80, 'no'],
      [...Array(3).fill('no')],[...Array(5).fill('no')],[],[]
    ],
    bpnormal: [
      [95, 120, 110, 80, 'no'],
      [...Array(3).fill('no')],[...Array(5).fill('no')],[],[]

    ],
    bphypertension_risk_past: [
      [80, 120, 120, 90, 'no'],
      [...Array(3).fill('no')],[...Array(5).fill('no')],[],[]
    ],
    bphypertension_risk: [
      [70, 120, 120, 90, 'no'],
      [...Array(3).fill('no')],[...Array(5).fill('no')],[],[]
    ],
    bphypertension_risk_no: [
      [80, 120, 142, 90, 'no'],
      [...Array(3).fill('no')],[...Array(5).fill('no')],[],[]
    ],
      
  },
  
  
  hypertension_referral:{
    resolved: [
      ['person'],
      ['yes','stroke']
    ],
    notresolved: [
      ['person'],
      ['no','forgot']

    ]
  },
  //for diabetes screning and referral input data
  diabetes: {
    triggers: [
      'Is your eyesight low, blurred vision',
      'Have very dry skin',
      'Do you have sores on your feet',
      'frequent urination (mostly at night)',
      'Have you lost a lot of weight',
      'Feeling very hungry and very thirsty',
      'Numb or tingling hands or feet',
      'Feeling very tired'
    ].map((sign, position) => {
      const dangerSigns = Array(8).fill('no');
      dangerSigns[position] = 'yes';
    
      return {
        sign,
        input: [ [80, 120, 'fbs', 99],['no', ...Array(3).fill('yes')],[...dangerSigns],[],[]]
      };
    }),
    noTriggers: [
  
      [80, 120, 'fbs', 99],['no', ...Array(3).fill('yes')],[...Array(8).fill('no')],[],[]
    ],
    highFBS: [
      [80, 120, 'fbs', 150]
    ],
    normalFBS: [
      [80, 120, 'fbs', 99]
    ],
    highPPS: [
      [80, 120, 'pps', 240]
    ],
    normalPPS: [
      [80, 120, 'pps', 139]
    ],
    diabetes_before_medsno: [
      ['yes', ...Array(3).fill('no'), 2, 0, 'no'],
      [...Array(8).fill('no')], [], []
    ],
    diabetes_before_medsyes: [
      ['yes', ...Array(3).fill('no'), 2, 0, 'yes'],
      [...Array(8).fill('no')], [], []
    ],
    diabetes_after: [
      ['no', ...Array(3).fill('yes')],
      [...Array(8).fill('no')], [], []
    ],
  },
  diabetes_referral:{
    resolved: [
      ['person'],
      ['yes','diabetes_1']
    ],
    notresolved: [
      ['person'],
      ['no','forgot']

    ]
  },
  
};

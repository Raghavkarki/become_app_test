module.exports = {
  run_every_days: 7,
  text_expression: 'at 11:00 pm on friday',
  fn: function (userCtx, contact, reports) {
    const daysToPurge = 7;
    const reportsToPurge = [];
    const oldReportedDate = Date.now() - (1000 * 60 * 60 * 24 * daysToPurge);
    const FORMS_TO_PURGE = [
      'married_woman_reproductive',
      'under_5_child',
      'non_communicable_diseases',
      'edu_status_5_18_yrs',
      'household_survey'
    ];

    const checkRules = (rule, report) => !rule || rule(report);

    const purgeReports = (reports, role, form, rule) => {
      if (userCtx.roles.includes(role)) {
        const filtered = reports.filter(r => form === r.form && r.reported_date <= oldReportedDate && checkRules(rule, r));
        reportsToPurge.push(...filtered.map(report => report._id));
      }
    };

    FORMS_TO_PURGE.forEach(form => purgeReports(reports, 'chn', form));

    return reportsToPurge;
  }
};

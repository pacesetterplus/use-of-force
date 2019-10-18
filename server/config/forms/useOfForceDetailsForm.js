const joi = require('@hapi/joi')
const { validations } = require('./validations')
const { buildValidationSpec } = require('../../services/validation')

const { requiredBooleanMsg, requiredOneOfMsg, requiredIntegerRangeMsg } = validations

const completeSchema = joi.object({
  positiveCommunication: requiredBooleanMsg('Select yes if positive communication was used'),
  personalProtectionTechniques: requiredBooleanMsg('Select yes if any personal protection techniques were used'),

  batonDrawn: requiredBooleanMsg('Select yes if a baton was drawn'),
  batonUsed: joi.when('batonDrawn', {
    is: true,
    then: requiredBooleanMsg('Select yes if a baton was used'),
    otherwise: joi.any().strip(),
  }),

  pavaDrawn: requiredBooleanMsg('Select yes if PAVA was drawn'),
  pavaUsed: joi.when('pavaDrawn', {
    is: true,
    then: requiredBooleanMsg('Select yes if PAVA was used'),
    otherwise: joi.any().strip(),
  }),

  guidingHold: requiredBooleanMsg('Select yes if a guiding hold was used'),
  guidingHoldOfficersInvolved: joi.when('guidingHold', {
    is: true,
    then: requiredIntegerRangeMsg(1, 2)('Select how many officers were involved in the guiding hold'),
    otherwise: joi.any().strip(),
  }),

  restraint: requiredBooleanMsg('Select yes if control and restraint was used'),
  restraintPositions: joi.when('restraint', {
    is: true,
    then: joi
      .alternatives()
      .try(
        joi
          .array()
          .items(
            requiredOneOfMsg('STANDING', 'FACE_DOWN', 'ON_BACK', 'KNEELING')(
              'Select the control and restraint positions used'
            )
          )
      )
      .required()
      .messages({ 'any.required': 'Select the control and restraint positions used' }),
    otherwise: joi.any().strip(),
  }),

  handcuffsApplied: requiredBooleanMsg('Select yes if handcuffs were applied'),
})

module.exports = {
  complete: buildValidationSpec(completeSchema),
  partial: {},
}

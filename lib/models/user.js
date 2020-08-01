const Joi = require('@hapi/joi');
const { Model } = require('objection');
const ModelBase = require('./helpers/ModelBase');

module.exports = class User extends ModelBase {
  static get tableName() {
    return 'main.users';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0).required(),
      email: Joi.string().email().required(),
      name: Joi.string().required(),
      profile_picture: Joi.string().uri(),
      github_link: Joi.string().uri(),
      linkedin_link: Joi.string().uri(),
      createdAt: Joi.date().required(),
    });
  }

  static get relationMappings() {
    const UserRole = require('./userRole');

    return {
      roles: {
        relation: Model.HasManyRelation,
        modelClass: UserRole,
        join: {
          from: 'main.users.id',
          to: 'main.user_roles.user_id',
        },
      },
    };
  }

  async $beforeInsert() {
    const now = new Date();
    this.createdAt = now;
  }
};
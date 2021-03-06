const Schmervice = require('schmervice');
const _ = require('underscore');
const Boom = require('@hapi/boom');

module.exports = class PathwayService extends Schmervice.Service {
  async create(pathwayInfo, txn) {
    const { Pathway } = this.server.models();
    return Pathway.query(txn).insert(pathwayInfo);
  }

  async find(txn) {
    const { Pathway } = this.server.models();
    return Pathway.query(txn);
  }

  async findById(id, txn) {
    const { Pathway } = this.server.models();
    return Pathway.query(txn).throwIfNotFound().findById(id);
  }

  async findByCode(code, txn) {
    const { Pathway } = this.server.models();
    const pathway = await Pathway.query(txn).findOne({ code });

    return pathway;
  }

  async update(id, info, txn) {
    const { Pathway } = this.server.models();

    await Pathway.query(txn).update(info).where({ id });

    return id;
  }

  async upsertMilestone(pathwayId, milestoneInfo, txn) {
    const { PathwayMilestone } = this.server.models();

    const addMilestoneAndUpdatePositions = async (tranx) => {
      const allMilestones = await PathwayMilestone.query(tranx).where({ pathway_id: pathwayId });

      const maxPosition = _.isEmpty(allMilestones)
        ? 0
        : _.max(allMilestones, (m) => m.position).position;
      if (_.isEmpty(allMilestones) && maxPosition === 0 && milestoneInfo.position !== 0) {
        throw Boom.badRequest('First milestone being created. Position should be 0 (zero).');
      } else if (milestoneInfo.position > maxPosition + 1) {
        throw Boom.badRequest(
          `Position of the last milestone is ${maxPosition}. Max position can be ${
            maxPosition + 1
          }.`
        );
      }

      if (milestoneInfo.id) {
        const milestoneToEdit = _.findWhere(allMilestones, { id: milestoneInfo.id });
        if (milestoneToEdit.position === 0 && milestoneInfo.position !== 0) {
          throw Boom.badRequest('Position of 0th milestone cannot be changed.');
        }
      }

      _.forEach(allMilestones, (milestone, i) => {
        if (milestone.position >= milestoneInfo.position) {
          allMilestones[i].position += 1;
        }
        if (milestoneInfo.id && milestone.id == milestoneInfo.id) {
          _.map(milestoneInfo, (value, key) => allMilestones[i][key] = value);
        }
      });
      if (!milestoneInfo.id) {
        allMilestones.push({ ...milestoneInfo, pathway_id: pathwayId });
      }

      await PathwayMilestone.query(tranx).upsertGraph(allMilestones);
      const milestone = await PathwayMilestone.query(tranx).where({
        pathway_id: pathwayId,
        position: milestoneInfo.position,
      });

      return milestone;
    };

    let milestone;
    if (!txn) {
      const tranx = await PathwayMilestone.startTransaction();
      milestone = await addMilestoneAndUpdatePositions(txn);
      await tranx.commit();
    } else {
      milestone = await addMilestoneAndUpdatePositions(txn);
    }

    return milestone;
  }

  async findMilestones(pathwayId, txn) {
    const { PathwayMilestone } = this.server.models();

    const milestones = await PathwayMilestone.query(txn)
      .where({ pathway_id: pathwayId })
      .orderBy('position');

    return milestones;
  }

  async findMilestoneById(id, txn) {
    const { PathwayMilestone } = this.server.models();
    return PathwayMilestone.query(txn).throwIfNotFound().findById(id);
  }
};

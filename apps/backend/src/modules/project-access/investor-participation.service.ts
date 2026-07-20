import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { Types } from 'mongoose';
import {
  Investor,
  InvestorStatus,
} from '../investors/schemas/investor.schema';
import {
  ParticipantApprovalStatus,
  ParticipantType,
  ProjectParticipant,
} from '../project-participants/schemas/project-participant.schema';

/**
 * Investor project participation checks used by default-deny InvestorScoped routes.
 * Separate from staff project_assignments.
 */
@Injectable()
export class InvestorParticipationService {
  constructor(
    @InjectModel(Investor.name) private readonly investorModel: Model<Investor>,
    @InjectModel(ProjectParticipant.name)
    private readonly participantModel: Model<ProjectParticipant>,
  ) {}

  async resolveLinkedInvestorId(actorId: string): Promise<string | null> {
    if (!Types.ObjectId.isValid(actorId)) {
      return null;
    }
    const investor = await this.investorModel
      .findOne({
        userId: new Types.ObjectId(actorId),
        status: { $ne: InvestorStatus.Inactive },
      })
      .select('_id')
      .lean()
      .exec();
    return investor ? String(investor._id) : null;
  }

  async listAuthorisedProjectIds(actorId: string): Promise<string[]> {
    const investorId = await this.resolveLinkedInvestorId(actorId);
    if (!investorId) {
      return [];
    }
    const participants = await this.participantModel
      .find({
        participantType: ParticipantType.OutsideInvestor,
        participantId: new Types.ObjectId(investorId),
        status: ParticipantApprovalStatus.Approved,
        effectiveTo: null,
      })
      .select('projectId')
      .lean()
      .exec();
    return participants.map((p) => String(p.projectId));
  }

  async assertCanAccessInvestorProject(
    actorId: string,
    projectId: string,
  ): Promise<{ investorId: string; projectId: string }> {
    const investorId = await this.resolveLinkedInvestorId(actorId);
    if (!investorId) {
      throw new ForbiddenException('Access denied');
    }
    if (!Types.ObjectId.isValid(projectId)) {
      throw new ForbiddenException('Access denied');
    }

    const participant = await this.participantModel
      .findOne({
        projectId: new Types.ObjectId(projectId),
        participantType: ParticipantType.OutsideInvestor,
        participantId: new Types.ObjectId(investorId),
        status: ParticipantApprovalStatus.Approved,
        effectiveTo: null,
      })
      .select('_id')
      .lean()
      .exec();

    if (!participant) {
      throw new ForbiddenException('Access denied');
    }

    return { investorId, projectId };
  }
}

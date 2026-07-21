import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import {
  SiteIssueSeverity,
  SiteIssueStatus,
  SiteIssueType,
} from '../schemas/site-issue.schema';

export class CreateSiteIssueDto {
  @ApiProperty()
  @IsMongoId()
  projectId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  siteId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  dprId?: string | null;

  @ApiProperty({ enum: SiteIssueType })
  @IsEnum(SiteIssueType)
  type!: SiteIssueType;

  @ApiProperty()
  @IsString()
  @MaxLength(240)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string | null;

  @ApiPropertyOptional({ enum: SiteIssueSeverity })
  @IsOptional()
  @IsEnum(SiteIssueSeverity)
  severity?: SiteIssueSeverity;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  photoDocumentIds?: string[];
}

export class UpdateSiteIssueDto extends PartialType(
  OmitType(CreateSiteIssueDto, ['projectId'] as const),
) {}

export class AssignSiteIssueDto {
  @ApiProperty()
  @IsMongoId()
  assigneeUserId!: string;
}

export class ListSiteIssuesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  siteId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  dprId?: string;

  @ApiPropertyOptional({ enum: SiteIssueStatus })
  @IsOptional()
  @IsEnum(SiteIssueStatus)
  status?: SiteIssueStatus;

  @ApiPropertyOptional({ enum: SiteIssueType })
  @IsOptional()
  @IsEnum(SiteIssueType)
  type?: SiteIssueType;

  @ApiPropertyOptional({ enum: SiteIssueSeverity })
  @IsOptional()
  @IsEnum(SiteIssueSeverity)
  severity?: SiteIssueSeverity;
}

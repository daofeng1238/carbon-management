import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('emission_factors')
export class Factor {
  @PrimaryColumn({ length: 10 })
  id: string;

  @Column({ name: 'lineage_id', type: 'uuid' })
  lineageId: string;

  @Column({ length: 200 })
  name: string;

  @Column({ name: 'category_code', length: 20 })
  categoryCode: string;

  @Column({ name: 'industry_code', length: 20, default: 'GENERAL' })
  industryCode: string;

  @Column({ type: 'numeric', precision: 20, scale: 6 })
  value: number;

  @Column({ length: 50 })
  unit: string;

  @Column({ type: 'text' })
  source: string;

  @Column({ length: 20 })
  version: string;

  @Column({ name: 'effective_date', type: 'date' })
  effectiveDate: string;

  @Column({ name: 'expiry_date', type: 'date', nullable: true })
  expiryDate: string;

  @Column({ length: 20, default: 'ISO' })
  standard: string;

  @Column({ name: 'scope_type', length: 20, default: 'general' })
  scopeType: string;

  @Column({ length: 20, default: 'enabled' })
  status: string;

  @Column({ name: 'gwp_note', type: 'text', nullable: true })
  gwpNote: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'created_by', nullable: true })
  createdBy: string;

  @Column({ name: 'updated_by', nullable: true })
  updatedBy: string;
}

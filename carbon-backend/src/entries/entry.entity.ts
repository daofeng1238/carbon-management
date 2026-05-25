import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('emission_entries')
export class Entry {
  @PrimaryColumn({ length: 20 })
  id: string;

  @Column({ name: 'org_id', type: 'uuid' })
  orgId: string;

  @Column({ length: 7 })
  period: string;

  @Column({ name: 'period_type', length: 10, default: 'month' })
  periodType: string;

  @Column({ name: 'category_code', length: 20 })
  categoryCode: string;

  @Column({ name: 'factor_id', length: 10 })
  factorId: string;

  @Column({ type: 'numeric', precision: 20, scale: 4 })
  quantity: number;

  @Column({ length: 50 })
  unit: string;

  @Column({ name: 'factor_value', type: 'numeric', precision: 20, scale: 6 })
  factorValue: number;

  @Column({ name: 'factor_unit', length: 50 })
  factorUnit: string;

  @Column('smallint')
  scope: number;

  @Column({ type: 'numeric', precision: 20, scale: 4 })
  emission: number;

  @Column({ length: 20, default: 'manual' })
  source: string;

  @Column({ name: 'import_job_id', type: 'uuid', nullable: true })
  importJobId: string;

  @Column({ length: 20, default: 'draft' })
  status: string;

  @Column({ name: 'submit_at', type: 'timestamp', nullable: true })
  submitAt: Date;

  @Column({ name: 'approve_at', type: 'timestamp', nullable: true })
  approveAt: Date;

  @Column({ name: 'approve_by', type: 'uuid', nullable: true })
  approveBy: string;

  @Column({ name: 'reject_reason', type: 'text', nullable: true })
  rejectReason: string;

  @Column({ type: 'text', nullable: true })
  remark: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'created_by', nullable: true })
  createdBy: string;

  @Column({ name: 'updated_by', nullable: true })
  updatedBy: string;
}

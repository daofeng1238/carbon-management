import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('reports')
export class Report {
  @PrimaryColumn({ length: 20 })
  id: string;

  @Column({ length: 500 })
  title: string;

  @Column({ name: 'org_id', type: 'uuid' })
  orgId: string;

  @Column({ length: 20 })
  period: string;

  @Column({ name: 'period_start', length: 7 })
  periodStart: string;

  @Column({ name: 'period_end', length: 7 })
  periodEnd: string;

  @Column({ length: 20, default: 'self' })
  scope: string;

  @Column({ length: 20, default: 'ISO' })
  standard: string;

  @Column({ type: 'jsonb' })
  config: any;

  @Column({ type: 'jsonb', nullable: true })
  snapshot: any;

  @Column({ name: 'pdf_path', length: 500, nullable: true })
  pdfPath: string;

  @Column({ name: 'word_path', length: 500, nullable: true })
  wordPath: string;

  @Column({ name: 'file_size', type: 'bigint', nullable: true })
  fileSize: number;

  @Column({ length: 20, default: 'draft' })
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'created_by', nullable: true })
  createdBy: string;
}

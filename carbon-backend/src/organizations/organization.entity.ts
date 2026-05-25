import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';

@Entity('organizations')
export class Organization {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ length: 50, unique: true })
  code: string;

  @Column({ length: 200 })
  name: string;

  @Column('smallint')
  level: number;

  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  parentId: string;

  @Column({ type: 'text', nullable: true })
  path: string;

  @Column({ name: 'industry_code', length: 20 })
  industryCode: string;

  @Column({ length: 100, nullable: true })
  standard: string;

  @Column({ length: 500, nullable: true })
  address: string;

  @Column({ nullable: true })
  employees: number;

  @Column({ length: 100, nullable: true })
  area: string;

  @Column({ length: 20, default: 'active' })
  status: string;

  @Column({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'created_by', nullable: true })
  createdBy: string;

  @Column({ name: 'updated_by', nullable: true })
  updatedBy: string;
}

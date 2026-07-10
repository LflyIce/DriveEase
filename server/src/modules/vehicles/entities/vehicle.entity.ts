import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('vehicle')
export class Vehicle {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ name: 'plate_number' }) plateNumber: string;
  @Column() brand: string;
  @Column() model: string;
  @Column({ nullable: true }) year: number | null;
  @Column({ nullable: true }) vin: string | null;
  @Column({ name: 'engine_number', nullable: true }) engineNumber: string | null;
  @Column({ name: 'customer_id' }) customerId: number;

  @Column({ name: 'brand_model', nullable: true }) brandModel: string | null;
  @Column({ name: 'energy_type', nullable: true }) energyType: string | null;
  @Column({ name: 'vehicle_type', nullable: true }) vehicleType: string | null;
  @Column({ name: 'register_date', nullable: true }) registerDate: string | null;
  @Column({ name: 'certificate_date', nullable: true }) certificateDate: string | null;
  @Column({ name: 'next_inspection_date', nullable: true }) nextInspectionDate: string | null;
  @Column({ name: 'transfer_flag', nullable: true }) transferFlag: string | null;
  @Column({ nullable: true }) seats: number | null;
  @Column({ name: 'load_capacity', nullable: true }) loadCapacity: number | null;

  @Column({ name: 'driving_front', nullable: true }) drivingFront: string | null;
  @Column({ name: 'driving_back', nullable: true }) drivingBack: string | null;

  @Column({ name: 'created_at', insert: false }) createdAt: string;
  @Column({ name: 'updated_at', insert: false }) updatedAt: string;
}

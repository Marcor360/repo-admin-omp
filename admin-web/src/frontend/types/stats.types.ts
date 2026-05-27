export interface GlobalStats {
  totalCongregations: number;
  activeCongregations: number;
  inactiveCongregations: number;
  activeUsers: number;
  inactiveUsers: number;
}

export interface CongregationStats {
  activeUsers: number;
  inactiveUsers: number;
  admins: number;
  supervisors: number;
  regularUsers: number;
}

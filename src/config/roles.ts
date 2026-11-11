const allRoles = {
  user: ['getProducts', 'getStatistics'],
  admin: ['getUsers', 'manageUsers', 'getProducts', 'manageProducts', 'getStatistics', 'manageStatistics'],
};

export const roles: string[] = Object.keys(allRoles);
export const roleRights: Map<string, string[]> = new Map(Object.entries(allRoles));

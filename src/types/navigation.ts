export type RootStackParamList = {
  Login: undefined;
  ProfileSetup: undefined;


  Home: undefined;
  Academics: { autoTriggerUpload?: boolean };
  CourseDetails: { courseId: string };
  AddCourse: undefined;
  AddAssignment: { courseId?: string };
  ExpenseDashboard: { autoTriggerScan?: boolean };
  ExpenseStats: undefined;
  ExpenseSetup: undefined;
  ExpenseSettings: undefined;
  AllTransactions: undefined;
  WorksDashboard: { autoTriggerAdd?: boolean };
  WorkSettings: undefined;
  WorkSetup: undefined;
  MealOnboarding: undefined;
  MealLoading: undefined;
  MealDashboard: undefined;
  MealRecipeDetail: { recipeId: string };
  DietarySettings: undefined;
  GroceryList: { fullPlan?: any, weekStartString?: string };
};

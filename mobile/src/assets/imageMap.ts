export const IMAGE_MAP: Record<string, any> = {
  "assorted-sushi.png": require("@/assets/images/assorted-sushi.png"),
  "chocolate-berry-cupcake.png": require("@/assets/images/chocolate-berry-cupcake.png"),
  "delicious-toppings-pizza.png": require("@/assets/images/delicious-toppings-pizza.png"),
  "fresh-salad-bowl.png": require("@/assets/images/fresh-salad-bowl.png"),
  "fresh-vegetable-spring-rolls.png": require("@/assets/images/fresh-vegetable-spring-rolls.png"),
  "gourmet-burger.png": require("@/assets/images/gourmet-burger.png"),
  "lasagna-slice.png": require("@/assets/images/lasagna-slice.png"),
  "restaurant-meat-vegetables.png": require("@/assets/images/restaurant-meat-vegetables.png"),
  "vegetable-rice-bowl.png": require("@/assets/images/vegetable-rice-bowl.png"),
  "placeholder.png": require("@/assets/images/placeholder.png"),
};

export type ImageName = keyof typeof IMAGE_MAP;


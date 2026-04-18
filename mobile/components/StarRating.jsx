import { useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, Animated } from "react-native";

export default function StarRating({
  initialRating = 0,
  maxStars = 5,
  size = 30,
  filledColor = "#f5b301",
  emptyColor = "#d0d5dd",
  onRatingChange,
  disabled = false,
}) {
  const [rating, setRating] = useState(initialRating);
  const animations = useRef(Array.from({ length: maxStars }, () => new Animated.Value(1))).current;

  useEffect(() => {
    setRating(initialRating);
  }, [initialRating]);

  const animateStars = (selectedRating) => {
    const sequence = animations.map((anim, index) =>
      Animated.timing(anim, {
        toValue: index < selectedRating ? 1.15 : 1,
        duration: 130,
        useNativeDriver: true,
      })
    );

    Animated.parallel(sequence).start(() => {
      const reset = animations.map((anim) =>
        Animated.spring(anim, {
          toValue: 1,
          speed: 18,
          bounciness: 7,
          useNativeDriver: true,
        })
      );
      Animated.parallel(reset).start();
    });
  };

  const handlePress = (selectedRating) => {
    if (disabled) return;
    setRating(selectedRating);
    animateStars(selectedRating);
    if (onRatingChange) onRatingChange(selectedRating);
  };

  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      {Array.from({ length: maxStars }, (_, index) => {
        const starValue = index + 1;
        const filled = starValue <= rating;

        return (
          <TouchableOpacity
            key={`star-${starValue}`}
            onPress={() => handlePress(starValue)}
            activeOpacity={0.8}
            disabled={disabled}
            style={{ marginRight: index === maxStars - 1 ? 0 : 4 }}
          >
            <Animated.View style={{ transform: [{ scale: animations[index] }] }}>
              <Text style={{ fontSize: size, color: filled ? filledColor : emptyColor }}>
                {filled ? "★" : "☆"}
              </Text>
            </Animated.View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

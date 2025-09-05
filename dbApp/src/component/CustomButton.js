import React from "react";
import { Text, StyleSheet, TouchableOpacity } from 'react-native';

const CustomButton = ({
  title,
  onPress,
  backgroundColor = "white",
  textColor = "#0E6251",
  fontSize = 18,
  fontWeight = "bold",
  width = 200,
  height = 60,
  borderRadius = 30,
  padding = 0,
  marginTop = 50,
  disabled = false,
  containerStyle,
  textStyle,
  shadowColor = "#000",
  shadowOffset = { width: 0, height: 4 },
  shadowOpacity = 0.1,
  shadowRadius = 4,
  elevation = 5,
  ...props
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor,
          width,
          height,
          borderRadius,
          marginTop,
          padding,
          shadowColor,
          shadowOffset,
          shadowOpacity,
          shadowRadius,
          elevation,
          opacity: disabled ? 0.6 : 1,
        },
        containerStyle,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={disabled}
      {...props}
    >
      <Text style={[
        styles.text,
        {
          color: textColor,
          fontSize,
          fontWeight,
        },
        textStyle
      ]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
  },
  text: {
    textAlign: "center",
  },
});

export default CustomButton;
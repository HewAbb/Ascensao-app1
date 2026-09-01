import React from "react";
import { View, Text } from "react-native";

export default function App() {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#05050B",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          color: "#9B84FF",
          fontSize: 28,
          fontWeight: "bold",
        }}
      >
        ASCENSÃO
      </Text>

      <Text
        style={{
          color: "#FFFFFF",
          fontSize: 16,
          marginTop: 10,
        }}
      >
        O app está funcionando.
      </Text>
    </View>
  );
}

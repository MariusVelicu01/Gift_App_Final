import { View, Text, Pressable } from "react-native";
import { Link } from "expo-router";

export default function Home() {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-3xl font-bold text-blue-600 mb-6">GiftApp 🎁</Text>
      <Link href="/search" asChild>
        <Pressable className="bg-blue-500 px-4 py-2 rounded-xl">
          <Text className="text-white font-semibold">Caută produse</Text>
        </Pressable>
      </Link>
    </View>
  );
}

import { useState } from "react";
import { View, Text, TextInput, FlatList, Pressable } from "react-native";

type Product = {
  id: string;
  name: string;
  price: number;
  store: string;
};

const PRODUCTS: Product[] = [
  { id: "1", name: "Dior Sauvage", price: 499, store: "Notino" },
  { id: "2", name: "Bleu de Chanel", price: 529, store: "Sephora" },
  { id: "3", name: "Armani Code", price: 389, store: "Douglas" },
  { id: "4", name: "Versace Eros", price: 449, store: "Elefant" },
  { id: "5", name: "YSL Y Eau de Parfum", price: 519, store: "Notino" },
];

export default function Search() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(PRODUCTS);

  const handleSearch = (text: string) => {
    setQuery(text);
    const filtered = PRODUCTS.filter((item) =>
      item.name.toLowerCase().includes(text.toLowerCase())
    );
    setResults(filtered);
  };

  return (
    <View className="flex-1 bg-white p-6">
      <Text className="text-2xl font-bold text-center mb-4 text-blue-600">
        Caută un produs 🎁
      </Text>

      <TextInput
        placeholder="Ex: Dior Sauvage..."
        value={query}
        onChangeText={handleSearch}
        className="border border-gray-300 rounded-xl p-3 mb-5 text-lg"
      />

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable className="p-4 mb-3 border rounded-xl bg-gray-50 border-gray-200">
            <Text className="text-lg font-semibold text-gray-800">
              {item.name}
            </Text>
            <Text className="text-gray-500">{item.store}</Text>
            <Text className="text-blue-600 font-bold">{item.price} RON</Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <Text className="text-center text-gray-500 mt-4">
            Niciun produs găsit 😕
          </Text>
        }
      />
    </View>
  );
}

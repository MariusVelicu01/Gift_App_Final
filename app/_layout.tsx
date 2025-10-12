import { Drawer } from 'expo-router/drawer';
import { Ionicons } from '@expo/vector-icons';

export default function Layout() {
  return (
    <Drawer
      screenOptions={{
        headerShown: true,
        drawerActiveTintColor: '#007aff',
      }}
    >
      {/* Ascunde complet pagina index */}
      <Drawer.Screen
        name="index"
        options={{
          drawerLabel: () => null,
          drawerItemStyle: { height: 0 },
        }}
      />

      <Drawer.Screen
        name="home"
        options={{
          drawerLabel: 'Acasă',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="search"
        options={{
          drawerLabel: 'Caută',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="search-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="favorites"
        options={{
          drawerLabel: 'Favorite',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="heart-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="settings"
        options={{
          drawerLabel: 'Setări',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
    </Drawer>
  );
}

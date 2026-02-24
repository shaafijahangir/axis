/**
 * Tab navigator for authenticated students.
 * Five tabs: Home (feed), Courses, Grades, Messages, AI.
 *
 * WHY: These match the 5 most-used student actions. Desktop has more nav items
 * because screen space allows it; mobile must be ruthless about what gets a tab.
 */
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';

// Simple icon component using text (avoids @expo/vector-icons for now)
function TabIcon({ symbol, focused }: { symbol: string; focused: boolean }) {
  return null; // Icons are set via tabBarIcon below with emoji for now
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: '#0f172a',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#f1f5f9',
          paddingBottom: Platform.OS === 'ios' ? 20 : 8,
          paddingTop: 8,
          height: Platform.OS === 'ios' ? 84 : 64,
          backgroundColor: '#fff',
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
        headerStyle: {
          backgroundColor: '#fff',
          shadowOpacity: 0,
          elevation: 0,
          borderBottomWidth: 1,
          borderBottomColor: '#f1f5f9',
        },
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 17,
          color: '#0f172a',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }) =>
            // Using emoji as icon placeholder — replace with expo-vector-icons if desired
            null,
        }}
      />
      <Tabs.Screen
        name="courses"
        options={{
          title: 'Courses',
          tabBarLabel: 'Courses',
        }}
      />
      <Tabs.Screen
        name="grades"
        options={{
          title: 'Grades',
          tabBarLabel: 'Grades',
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarLabel: 'Messages',
        }}
      />
      <Tabs.Screen
        name="ai"
        options={{
          title: 'AI',
          tabBarLabel: 'AI',
        }}
      />
    </Tabs>
  );
}

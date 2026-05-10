/**
 * Tab navigator for authenticated students.
 * Five tabs: Home (feed), Courses, Grades, Messages, AI.
 *
 * WHY: These match the 5 most-used student actions. Desktop has more nav items
 * because screen space allows it; mobile must be ruthless about what gets a tab.
 */
import { Tabs, router } from 'expo-router';
import { Platform, TouchableOpacity, Text, StyleSheet } from 'react-native';

function ProfileButton() {
  return (
    <TouchableOpacity
      onPress={() => router.push('/profile')}
      style={tabStyles.profileButton}
      activeOpacity={0.7}
    >
      <Text style={tabStyles.profileButtonText}>⊙</Text>
    </TouchableOpacity>
  );
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
          headerRight: () => <ProfileButton />,
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

const tabStyles = StyleSheet.create({
  profileButton: {
    marginRight: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileButtonText: {
    fontSize: 18,
    color: '#475569',
    lineHeight: 22,
  },
});

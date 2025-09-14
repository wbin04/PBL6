import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import {
  BarChart3,
  PieChart,
  TrendingUp,
  Users,
  ShoppingBag,
  DollarSign,
  Calendar,
  MessageSquare,
  Settings,
  Bell,
  Search,
  Filter,
  Eye,
  Menu,
  X,
} from 'lucide-react-native';
import { Fonts } from '@/constants/Fonts';

const { width } = Dimensions.get('window');

export default function AdminHomeScreen() {
  const [selectedPeriod, setSelectedPeriod] = useState('Weekly');
  const [sidebarVisible, setSidebarVisible] = useState(false);

  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
  };

  const stats = [
    {
      title: 'Total Orders',
      value: '75',
      icon: ShoppingBag,
      color: '#10b981',
      bgColor: '#f0fdf4',
    },
    {
      title: 'Total Delivered',
      value: '357',
      icon: TrendingUp,
      color: '#f59e0b',
      bgColor: '#fffbeb',
    },
    {
      title: 'Total Cancelled',
      value: '65',
      icon: Users,
      color: '#ef4444',
      bgColor: '#fef2f2',
    },
    {
      title: 'Total Revenue',
      value: '$128',
      icon: DollarSign,
      color: '#6366f1',
      bgColor: '#f0f9ff',
    },
  ];

  const menuItems = [
    { title: 'Dashboard', icon: BarChart3, active: true },
    { title: 'Order List', icon: ShoppingBag },
    { title: 'Order Detail', icon: Eye },
    { title: 'Customer', icon: Users },
    { title: 'Analytics', icon: TrendingUp },
    { title: 'Reviews', icon: MessageSquare },
    { title: 'Foods', icon: ShoppingBag },
    { title: 'Food Detail', icon: Eye },
    { title: 'Customer Detail', icon: Users },
    { title: 'Calendar', icon: Calendar },
    { title: 'Chat', icon: MessageSquare },
    { title: 'Wallet', icon: DollarSign },
  ];

  const reviews = [
    {
      name: 'Jone Sena',
      rating: 4.5,
      comment: 'Lorem ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry\'s',
      image: '🍜',
    },
    {
      name: 'Sofia',
      rating: 4.0,
      comment: 'Lorem ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry\'s',
      image: '🍕',
    },
    {
      name: 'Anandraesayah',
      rating: 4.5,
      comment: 'Lorem ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry\'s',
      image: '🍔',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />
      
      <View style={styles.wrapper}>
        {/* Sidebar - Conditional Rendering */}
        {sidebarVisible && (
          <>
            {/* Overlay */}
            <TouchableOpacity 
              style={styles.overlay} 
              activeOpacity={1} 
              onPress={toggleSidebar}
            />
            
            {/* Sidebar */}
            <View style={styles.sidebar}>
              <View style={styles.logoContainer}>
                <View style={styles.logoHeader}>
                  <Text style={styles.logo}>Sedap.</Text>
                  <TouchableOpacity onPress={toggleSidebar} style={styles.closeButton}>
                    <X size={20} color="#6b7280" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.logoSubtitle}>Food delivery dashboard</Text>
              </View>

              <ScrollView style={styles.menuContainer} showsVerticalScrollIndicator={false}>
                {menuItems.map((item, index) => {
                  const IconComponent = item.icon;
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[styles.menuItem, item.active && styles.menuItemActive]}
                      onPress={() => {
                        // Handle menu item navigation here
                        setSidebarVisible(false); // Close sidebar after selection
                      }}
                    >
                      <IconComponent 
                        size={16} 
                        color={item.active ? '#10b981' : '#6b7280'} 
                      />
                      <Text style={[styles.menuText, item.active && styles.menuTextActive]}>
                        {item.title}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </>
        )}

        {/* Main Content */}
        <View style={styles.mainContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <TouchableOpacity onPress={toggleSidebar} style={styles.menuButton}>
                <Menu size={20} color="#1f2937" />
              </TouchableOpacity>
              <View style={styles.headerTitles}>
                <Text style={styles.headerTitle}>Dashboard</Text>
                <Text style={styles.headerSubtitle}>Hi, Samantha. Welcome back to Sedap Admin!</Text>
              </View>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.headerButton}>
                <Search size={18} color="#6b7280" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerButton}>
                <Bell size={18} color="#6b7280" />
              </TouchableOpacity>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>S</Text>
              </View>
            </View>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Stats Cards */}
            <View style={styles.statsContainer}>
              {stats.slice(0, 2).map((stat, index) => {
                const IconComponent = stat.icon;
                return (
                  <View key={index} style={styles.statCard}>
                    <View style={[styles.statIcon, { backgroundColor: stat.bgColor }]}>
                      <IconComponent size={20} color={stat.color} />
                    </View>
                    <Text style={styles.statValue}>{stat.value}</Text>
                    <Text style={styles.statTitle}>{stat.title}</Text>
                  </View>
                );
              })}
            </View>
            
            <View style={styles.statsContainer}>
              {stats.slice(2, 4).map((stat, index) => {
                const IconComponent = stat.icon;
                return (
                  <View key={index + 2} style={styles.statCard}>
                    <View style={[styles.statIcon, { backgroundColor: stat.bgColor }]}>
                      <IconComponent size={20} color={stat.color} />
                    </View>
                    <Text style={styles.statValue}>{stat.value}</Text>
                    <Text style={styles.statTitle}>{stat.title}</Text>
                  </View>
                );
              })}
            </View>

            {/* Chart Section */}
            <View style={styles.chartSection}>
              <Text style={styles.chartTitle}>Analytics Overview</Text>
              <View style={styles.chartContainer}>
                <View style={styles.chartPlaceholder}>
                  <PieChart size={40} color="#10b981" />
                  <Text style={styles.chartText}>Dashboard Chart</Text>
                </View>
              </View>
            </View>

            {/* Quick Actions */}
            <View style={styles.quickActions}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              <View style={styles.actionGrid}>
                <TouchableOpacity style={styles.actionItem}>
                  <ShoppingBag size={20} color="#10b981" />
                  <Text style={styles.actionText}>Orders</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionItem}>
                  <Users size={20} color="#3b82f6" />
                  <Text style={styles.actionText}>Customers</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionItem}>
                  <TrendingUp size={20} color="#f59e0b" />
                  <Text style={styles.actionText}>Analytics</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionItem}>
                  <MessageSquare size={20} color="#ef4444" />
                  <Text style={styles.actionText}>Reviews</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  wrapper: {
    flex: 1,
    flexDirection: 'row',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1,
  },
  sidebar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 280,
    backgroundColor: '#fff',
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
    zIndex: 2,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  logoContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  logoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  closeButton: {
    padding: 4,
  },
  logo: {
    fontSize: 18,
    fontFamily: Fonts.LeagueSpartanBold,
    color: '#1f2937',
    marginBottom: 2,
  },
  logoSubtitle: {
    fontSize: 10,
    color: '#6b7280',
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  menuContainer: {
    flex: 1,
    paddingVertical: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 8,
    borderRadius: 6,
  },
  menuItemActive: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#10b981',
  },
  menuText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#6b7280',
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  menuTextActive: {
    color: '#10b981',
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },
  sidebarFooter: {
    padding: 16,
  },
  upgradeCard: {
    backgroundColor: '#10b981',
    borderRadius: 8,
    padding: 12,
  },
  upgradeTitle: {
    color: '#fff',
    fontSize: 12,
    fontFamily: Fonts.LeagueSpartanBold,
    marginBottom: 2,
  },
  upgradeText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: Fonts.LeagueSpartanRegular,
    marginBottom: 8,
    opacity: 0.9,
  },
  upgradeButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },
  mainContent: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f9fafb',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginRight: 12,
  },
  headerTitles: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: Fonts.LeagueSpartanBold,
    color: '#1f2937',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f9fafb',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: Fonts.LeagueSpartanBold,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontFamily: Fonts.LeagueSpartanBold,
    color: '#1f2937',
    marginBottom: 2,
  },
  statTitle: {
    fontSize: 10,
    color: '#6b7280',
    fontFamily: Fonts.LeagueSpartanRegular,
    textAlign: 'center',
  },
  chartSection: {
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 16,
    fontFamily: Fonts.LeagueSpartanBold,
    color: '#1f2937',
    marginBottom: 12,
  },
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  chartText: {
    fontSize: 12,
    color: '#6b7280',
    fontFamily: Fonts.LeagueSpartanRegular,
    marginTop: 8,
  },
  quickActions: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: Fonts.LeagueSpartanBold,
    color: '#1f2937',
    marginBottom: 12,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    width: '47%',
  },
  actionText: {
    fontSize: 12,
    color: '#6b7280',
    fontFamily: Fonts.LeagueSpartanSemiBold,
    marginTop: 8,
  },
  // Keep existing styles for compatibility
  chartsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  chartCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartControls: {
    flexDirection: 'row',
    gap: 8,
  },
  chartControl: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
  },
  chartControlText: {
    fontSize: 12,
    color: '#6b7280',
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  reportButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  reportButtonText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },
  pieChartContainer: {
    alignItems: 'center',
  },
  pieChart: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieSlice: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginBottom: 4,
  },
  pieLabels: {
    alignItems: 'flex-start',
  },
  pieLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  pieDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  pieLabelText: {
    fontSize: 12,
    color: '#6b7280',
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  lineChartContainer: {
    height: 200,
  },
  lineChart: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartPlaceholderText: {
    fontSize: 16,
    color: '#6b7280',
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  bottomSection: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  revenueCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  revenueTitle: {
    fontSize: 16,
    fontFamily: Fonts.LeagueSpartanBold,
    color: '#1f2937',
    marginBottom: 16,
  },
  revenueChart: {
    height: 200,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  mapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  mapTitle: {
    fontSize: 16,
    fontFamily: Fonts.LeagueSpartanBold,
    color: '#1f2937',
  },
  mapWeekly: {
    fontSize: 14,
    color: '#6b7280',
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },
  mapChart: {
    height: 200,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewsSection: {
    marginBottom: 32,
  },
  reviewsHeader: {
    marginBottom: 16,
  },
  reviewsTitle: {
    fontSize: 20,
    fontFamily: Fonts.LeagueSpartanBold,
    color: '#1f2937',
    marginBottom: 4,
  },
  reviewsSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  reviewsContainer: {
    paddingVertical: 8,
  },
  reviewCard: {
    width: 280,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  reviewImage: {
    fontSize: 32,
    marginRight: 12,
  },
  reviewInfo: {
    flex: 1,
  },
  reviewName: {
    fontSize: 14,
    fontFamily: Fonts.LeagueSpartanBold,
    color: '#1f2937',
    marginBottom: 4,
  },
  reviewRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewStars: {
    fontSize: 12,
    marginRight: 4,
  },
  reviewRatingText: {
    fontSize: 12,
    color: '#6b7280',
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  reviewComment: {
    fontSize: 12,
    color: '#6b7280',
    fontFamily: Fonts.LeagueSpartanRegular,
    lineHeight: 16,
  },
});
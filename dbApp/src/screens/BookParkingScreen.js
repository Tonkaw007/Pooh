import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Dimensions } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Ionicons from 'react-native-vector-icons/Ionicons';

const { width: screenWidth } = Dimensions.get('window');
const toLocalISOString = (date) => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const BookParkingScreen = ({ navigation, route }) => {
  const { username, bookingType, visitorInfo, licensePlate } = route.params;
  const [selectedRate, setSelectedRate] = useState(null);
  const [entryDate, setEntryDate] = useState(new Date());
  const [entryTime, setEntryTime] = useState(new Date());
  const [exitDate, setExitDate] = useState(new Date());
  const [exitTime, setExitTime] = useState(new Date());
  const [residentLicensePlate] = useState(licensePlate || '');
  
  // State สำหรับการจองรายเดือน
  const [durationMonths, setDurationMonths] = useState(1);
  // State สำหรับการจองรายชั่วโมง
  const [durationHours, setDurationHours] = useState(1);
  // State สำหรับการจองรายวัน
  const [durationDays, setDurationDays] = useState(1);

  const [pickerMode, setPickerMode] = useState(null); 
  const [showPicker, setShowPicker] = useState(false);

  const scrollViewRef = useRef(null);
  const dailyScrollViewRef = useRef(null);
  const hasSetMonthlyTimes = useRef(false);

  const rates = [
    { id: 'hourly', label: 'Hourly', price: '40 baht/hour' },
    { id: 'daily', label: 'Daily', price: '250 baht/day' },
    { id: 'monthly', label: 'Monthly', price: '3,000 baht/month' }
  ];

  // --- ✅ แก้ไข: Logic คำนวณเวลาออก สำหรับ hourly และ daily (ป้องกัน infinite loop) ---
  useEffect(() => {
    if (selectedRate === 'hourly') {
      const entryDateTime = new Date(entryDate);
      entryDateTime.setHours(entryTime.getHours(), entryTime.getMinutes(), 0, 0);
      const exitDateTime = new Date(entryDateTime.getTime() + durationHours * 60 * 60 * 1000);
      
      // ✅ ใช้ functional update และเช็คว่าค่าเปลี่ยนจริงๆ ก่อน set
      setExitDate(prev => {
        const newTime = exitDateTime.getTime();
        return prev.getTime() === newTime ? prev : new Date(newTime);
      });
      
      setExitTime(prev => {
        const newTime = exitDateTime.getTime();
        return prev.getTime() === newTime ? prev : new Date(newTime);
      });

    } else if (selectedRate === 'daily') {
      const newExit = new Date(entryDate);
      newExit.setDate(newExit.getDate() + durationDays);
      
      setExitDate(prev => {
        const newTime = newExit.getTime();
        return prev.getTime() === newTime ? prev : new Date(newTime);
      });
      
      // ✅ สร้าง exitTime ใหม่ที่ไม่ depend on state เดิม
      const newExitTime = new Date(entryTime);
      setExitTime(prev => {
        const newTime = newExitTime.getTime();
        return prev.getTime() === newTime ? prev : new Date(newTime);
      });
    }
  }, [entryDate, entryTime.getTime(), durationHours, durationDays, selectedRate]);

  // --- Logic คำนวณเวลาออก สำหรับ monthly ---
  useEffect(() => {
    if (selectedRate === 'monthly') {
      const newExit = new Date(entryDate);
      newExit.setMonth(newExit.getMonth() + durationMonths);
      setExitDate(newExit);
      
      // ตั้งค่าเวลา default เพียงครั้งเดียวเมื่อเปลี่ยนเป็น monthly
      if (!hasSetMonthlyTimes.current) {
        const defaultEntryTime = new Date(entryDate);
        defaultEntryTime.setHours(0, 0, 0, 0);
        setEntryTime(defaultEntryTime);
        
        const defaultExitTime = new Date(newExit);
        defaultExitTime.setHours(23, 59, 0, 0);
        setExitTime(defaultExitTime);
        
        hasSetMonthlyTimes.current = true;
      }
    } else {
      // รีเซ็ตเมื่อเปลี่ยนไปใช้ rate อื่น
      hasSetMonthlyTimes.current = false;
    }
  }, [entryDate, durationMonths, selectedRate]);

  // ✅ แก้ไข: Auto-scroll to selected hour in vertical picker
  useEffect(() => {
    if (scrollViewRef.current && selectedRate === 'hourly' && durationHours) {
      const scrollPosition = Math.max(0, (durationHours - 1) * 60);
      
      const timer = setTimeout(() => {
        try {
          scrollViewRef.current?.scrollTo({
            y: scrollPosition,
            animated: true
          });
        } catch (error) {
          console.log('Scroll error:', error);
        }
      }, 150);
      
      return () => clearTimeout(timer);
    }
  }, [selectedRate, durationHours]);

  // ✅ แก้ไข: Auto-scroll to selected day in daily picker
  useEffect(() => {
    if (dailyScrollViewRef.current && selectedRate === 'daily' && durationDays) {
      const scrollPosition = Math.max(0, (durationDays - 1) * 60);
      
      const timer = setTimeout(() => {
        try {
          dailyScrollViewRef.current?.scrollTo({
            y: scrollPosition,
            animated: true
          });
        } catch (error) {
          console.log('Scroll error:', error);
        }
      }, 150);
      
      return () => clearTimeout(timer);
    }
  }, [selectedRate, durationDays]);

  const calculatePrice = () => {
    if (!selectedRate) return 0;
    switch (selectedRate) {
      case 'hourly': 
        return durationHours * 40;
      case 'daily': 
        return durationDays * 250;
      case 'monthly':
        return durationMonths * 3000;
      default:
        return 0;
    }
  };

  const formatDate = (date) =>
    date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const formatTime = (time) =>
    time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

  const onChangeDateTime = (event, selectedValue) => {
    setShowPicker(false);
    if (!selectedValue) return;

    switch (pickerMode) {
      case 'entryDate':
        setEntryDate(selectedValue);
        break;
      case 'entryTime': 
        setEntryTime(selectedValue);
        break;
    }
  };

  const handleSearch = () => {
    if (!selectedRate) {
      Alert.alert('Error', 'Please select a parking rate');
      return;
    }

    const now = new Date();
    const entryDateTime = new Date(
      entryDate.getFullYear(),
      entryDate.getMonth(),
      entryDate.getDate(),
      entryTime.getHours(),
      entryTime.getMinutes()
    );

    if (entryDateTime < now) {
      Alert.alert('Error', 'Entry date/time cannot be in the past.');
      return;
    }

    const exitDateTime = new Date(exitDate);
    if (selectedRate === 'hourly') {
      exitDateTime.setHours(exitTime.getHours(), exitTime.getMinutes(), 0, 0);
    }

    const price = calculatePrice();

    const bookingData = {
      username,
      bookingType,
      rateType: selectedRate,
      createdAt: new Date().toISOString(),
      price,
      entryDate: toLocalISOString(entryDate),
      exitDate: toLocalISOString(exitDateTime),
      bookingDate: toLocalISOString(new Date()), 
      licensePlate: bookingType === 'resident' ? residentLicensePlate : undefined,
      entryTime: formatTime(entryTime),
      exitTime: formatTime(exitTime),
    };

    if (selectedRate === 'hourly') {
      bookingData.durationHours = durationHours;
    } else if (selectedRate === 'daily') {
      bookingData.durationDays = durationDays;
    } else if (selectedRate === 'monthly') {
      bookingData.durationMonths = durationMonths;
    }

    navigation.navigate('Reservation', {
      username,
      bookingData: {
        ...bookingData,
        visitorInfo
      },
      bookingType
    });
  };

  const handleBack = () => {
    navigation.navigate('BookingType', { username, residentLicensePlate });
  };

  // สร้างตัวเลือกชั่วโมงตั้งแต่ 1 ถึง 12
  const hourOptions = Array.from({ length: 12 }, (_, i) => i + 1);
  // สร้างตัวเลือกวันตั้งแต่ 1 ถึง 7
  const dayOptions = Array.from({ length: 7 }, (_, i) => i + 1);

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding">
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Book Parking</Text>
        </View>

        {/* เลือก rate */}
        <View style={styles.section}>
          <View style={styles.ratesContainer}>
            {rates.map((rate) => (
              <TouchableOpacity
                key={rate.id}
                style={[styles.rateButton, selectedRate === rate.id && styles.selectedRateButton]}
                onPress={() => setSelectedRate(rate.id)}
              >
                <Text style={[styles.rateLabel, selectedRate === rate.id && styles.selectedRateLabel]}>
                  {rate.label}
                </Text>
                <Text style={[styles.ratePrice, selectedRate === rate.id && styles.selectedRatePrice]}>
                  {rate.price}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* เลือกวันเวลา */}
        {(selectedRate === 'hourly' || selectedRate === 'daily' || selectedRate === 'monthly') && (
          <View style={styles.inputGroup}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Entry Date</Text>
              <TouchableOpacity
                style={styles.dateTimeBox}
                onPress={() => { setPickerMode('entryDate'); setShowPicker(true); }}
              >
                <Text style={styles.dateTimeValue}>{formatDate(entryDate)}</Text>
                <Ionicons name="calendar" size={22} color="#B19CD8" style={{ marginLeft: 10 }} />
              </TouchableOpacity>
            </View>

            {(selectedRate === 'hourly' || selectedRate === 'daily') && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Entry Time</Text>
                <TouchableOpacity
                  style={styles.dateTimeBox}
                  onPress={() => { setPickerMode('entryTime'); setShowPicker(true); }}
                >
                  <Text style={styles.dateTimeValue}>{formatTime(entryTime)}</Text>
                  <Ionicons name="time" size={22} color="#B19CD8" style={{ marginLeft: 10 }} />
                </TouchableOpacity>
              </View>
            )}

            {selectedRate === 'hourly' && (
              <>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Parking Duration (Hours)</Text>
                  
                  <View style={styles.durationCard}>
                    <View style={styles.pickerContainer}>
                      <View style={styles.pickerFadeTop} />
                      <View style={styles.pickerSelectionHighlight} />
                      
                      <ScrollView
                        ref={scrollViewRef}
                        showsVerticalScrollIndicator={false}
                        snapToInterval={60}
                        decelerationRate="fast"
                        contentContainerStyle={styles.pickerScrollContent}
                        style={styles.pickerScrollView}
                        onMomentumScrollEnd={(event) => {
                          const offsetY = event.nativeEvent.contentOffset.y;
                          const index = Math.max(0, Math.min(Math.round(offsetY / 60), hourOptions.length - 1));
                          const selectedHour = hourOptions[index];
                          
                          if (selectedHour !== undefined && selectedHour !== durationHours) {
                            setDurationHours(selectedHour);
                          }
                        }}
                      >
                        <View style={{ height: 120 }} />
                        {hourOptions.map((hour) => (
                          <TouchableOpacity
                            key={hour}
                            style={styles.pickerItem}
                            onPress={() => {
                              const index = hourOptions.indexOf(hour);
                              scrollViewRef.current?.scrollTo({
                                y: index * 60,
                                animated: true
                              });
                              setDurationHours(hour);
                            }}
                          >
                            <Text style={[
                              styles.pickerItemText,
                              durationHours === hour && styles.pickerItemTextSelected
                            ]}>
                              {hour}
                            </Text>
                          </TouchableOpacity>
                        ))}
                        <View style={{ height: 120 }} />
                      </ScrollView>
                      
                      <View style={styles.pickerFadeBottom} />
                    </View>

                    <Text style={styles.durationHelpText}>
                      Scroll to select duration 1-12 hours available
                    </Text>
                  </View>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Exit Date</Text>
                  <View style={styles.readOnlyBox}>
                    <Text style={styles.dateTimeValue}>{formatDate(exitDate)}</Text>
                  </View>
                </View>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Exit Time</Text>
                  <View style={styles.readOnlyBox}>
                    <Text style={styles.dateTimeValue}>{formatTime(exitTime)}</Text>
                  </View>
                </View>
              </>
            )}

            {selectedRate === 'daily' && (
              <>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Parking Duration (Days)</Text>
                  
                  <View style={styles.durationCard}>
                    <View style={styles.pickerContainer}>
                      <View style={styles.pickerFadeTop} />
                      <View style={styles.pickerSelectionHighlight} />
                      
                      <ScrollView
                        ref={dailyScrollViewRef}
                        showsVerticalScrollIndicator={false}
                        snapToInterval={60}
                        decelerationRate="fast"
                        contentContainerStyle={styles.pickerScrollContent}
                        style={styles.pickerScrollView}
                        onMomentumScrollEnd={(event) => {
                          const offsetY = event.nativeEvent.contentOffset.y;
                          const index = Math.max(0, Math.min(Math.round(offsetY / 60), dayOptions.length - 1));
                          const selectedDay = dayOptions[index];
                          
                          if (selectedDay !== undefined && selectedDay !== durationDays) {
                            setDurationDays(selectedDay);
                          }
                        }}
                      >
                        <View style={{ height: 120 }} />
                        {dayOptions.map((day) => (
                          <TouchableOpacity
                            key={day}
                            style={styles.pickerItem}
                            onPress={() => {
                              const index = dayOptions.indexOf(day);
                              dailyScrollViewRef.current?.scrollTo({
                                y: index * 60,
                                animated: true
                              });
                              setDurationDays(day);
                            }}
                          >
                            <Text style={[
                              styles.pickerItemText,
                              durationDays === day && styles.pickerItemTextSelected
                            ]}>
                              {day}
                            </Text>
                          </TouchableOpacity>
                        ))}
                        <View style={{ height: 120 }} />
                      </ScrollView>
                      
                      <View style={styles.pickerFadeBottom} />
                    </View>

                    <Text style={styles.durationHelpText}>
                      Scroll to select duration 1-7 days available
                    </Text>
                  </View>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Exit Date</Text>
                  <View style={styles.readOnlyBox}>
                    <Text style={styles.dateTimeValue}>{formatDate(exitDate)}</Text>
                  </View>
                </View>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Exit Time</Text>
                  <View style={styles.readOnlyBox}>
                    <Text style={styles.dateTimeValue}>{formatTime(exitTime)}</Text>
                  </View>
                </View>
              </>
            )}

            {selectedRate === 'monthly' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Duration (months)</Text>
                <View style={styles.durationContainer}>
                  {[1, 2, 3].map((m) => (
                    <TouchableOpacity
                      key={m}
                      style={[styles.durationButton, durationMonths === m && styles.selectedDuration]}
                      onPress={() => setDurationMonths(m)}
                    >
                      <Text style={[styles.durationText, durationMonths === m && styles.selectedDurationText]}>{m}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {selectedRate && (
          <View style={styles.priceContainer}>
            <Text style={styles.priceText}>Price: {calculatePrice()} baht</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.searchButton, !selectedRate && styles.disabledButton]}
          onPress={handleSearch}
          disabled={!selectedRate}
        >
          <Text style={styles.searchText}>Search</Text>
        </TouchableOpacity>

        {showPicker && (() => {
          let minDate;
          const today = new Date();
          const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());

          if (pickerMode === 'entryDate') {
            if (selectedRate === 'daily' || selectedRate === 'monthly') {
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              tomorrow.setHours(0, 0, 0, 0);
              minDate = tomorrow;
            } else {
              minDate = todayDateOnly;
            }
          } else if (pickerMode === 'entryTime') {
            if (entryDate.toDateString() === today.toDateString()) {
              minDate = today;
            } else {
              minDate = undefined;
            }
          } else {
            minDate = undefined;
          }
          
          return (
            <DateTimePicker
              value={
                pickerMode === 'entryDate' ? entryDate
                  : pickerMode === 'entryTime' ? entryTime
                  : new Date()
              }
              mode={pickerMode?.includes('Date') ? 'date' : 'time'}
              is24Hour={true}
              display="default"
              onChange={onChangeDateTime}
              minimumDate={minDate}
            />
          );
        })()}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#B19CD8' 
  },
  scrollContainer: { 
    padding: 25, 
    paddingTop: 60,
    paddingBottom: 40,
  },
  backButton: { 
    position: 'absolute', 
    top: 40, 
    left: 20, 
    zIndex: 1, 
    padding: 8 
  },
  header: { 
    alignItems: 'center', 
    marginBottom: 40, 
    marginTop: 20 
  },
  title: { 
    fontSize: 32, 
    fontWeight: 'bold', 
    color: 'white', 
    textAlign: 'center' 
  },
  section: { 
    marginBottom: 20 
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#333', 
    marginBottom: 8 
  },
  ratesContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-around', 
    marginHorizontal: 1
  },
  rateButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    paddingVertical: 15,
    paddingHorizontal: 20,
    minWidth: 100,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedRateButton: { 
    backgroundColor: 'white', 
    borderColor: '#fff' 
  },
  rateLabel: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: 'white' 
  },
  selectedRateLabel: { 
    color: '#B19CD8' 
  },
  ratePrice: { 
    fontSize: 12, 
    color: 'rgba(255, 255, 255, 0.8)', 
    marginTop: 4 
  },
  selectedRatePrice: { 
    color: '#666' 
  },
  inputGroup: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    marginHorizontal: 10,
    marginBottom: 20,
    shadowColor: 'black',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  dateTimeBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginHorizontal: 10,
    borderWidth: 1,
    borderColor: '#aaa',   
  },
  readOnlyBox: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    padding: 15,
    marginHorizontal: 10,
    borderWidth: 1,
    borderColor: '#ccc',   
  },
  dateTimeValue: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: '#333' 
  },
  durationContainer: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    marginTop: 10 
  },
  durationButton: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginHorizontal: 4,
  },
  selectedDuration: { 
    backgroundColor: '#B19CD8' 
  },
  durationText: { 
    fontSize: 16, 
    color: '#333', 
    fontWeight: 'bold' 
  },
  selectedDurationText: { 
    color: 'white' 
  },
  durationCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 10,
    borderWidth: 2,
    borderColor: '#e8e8e8',
  },
  pickerContainer: {
    height: 300,
    position: 'relative',
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 15,
  },
  pickerScrollView: {
    flex: 1,
  },
  pickerScrollContent: {
    alignItems: 'center',
  },
  pickerItem: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  pickerItemText: {
    fontSize: 32,
    fontWeight: '600',
    color: '#666666',
  },
  pickerItemTextSelected: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#B19CD8',
  },
  pickerSelectionHighlight: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 60,
    marginTop: -30,
    backgroundColor: 'rgba(177, 156, 216, 0.1)',
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#B19CD8',
    zIndex: 1,
    pointerEvents: 'none',
  },
  pickerFadeTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    backgroundColor: 'rgba(255,255,255,0.9)',
    zIndex: 2,
    pointerEvents: 'none',
  },
  pickerFadeBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
    backgroundColor: 'rgba(255,255,255,0.9)',
    zIndex: 2,
    pointerEvents: 'none',
  },
  durationHelpText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  searchButton: {
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 15,
    alignItems: 'center',
    marginTop: 30,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: '#B19CD8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  searchText: { 
    color: '#B19CD8', 
    fontSize: 20, 
    fontWeight: 'bold' 
  },
  disabledButton: { 
    opacity: 0.5 
  },
  priceContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 15,
    marginHorizontal: 10,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: 'black',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  priceText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#B19CD8',
  },
});

export default BookParkingScreen;
// src/components/ToastConfig.js
import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import colors from '../colors/Colors'




const toastConfig = {
    success: ({ text1, text2 }) => (
        <View style={styles.container}>
            <View style={[styles.toastBox, { backgroundColor: '#DCFCE7' }]}>
                <View style={[styles.leftBar, { backgroundColor: '#16A34A' }]} />
                <View style={{ flex: 1 }}>
                    <Text style={styles.title}>{text1}</Text>
                    {text2 ? <Text style={styles.message}>{text2}</Text> : null}
                </View>
            </View>
        </View>
    ),

    error: ({ text1, text2 }) => (
        <View style={styles.container}>
            <View style={[styles.toastBox, { backgroundColor: '#FEE2E2' }]}>
                <View style={[styles.leftBar, { backgroundColor: '#DC2626' }]} />
                <View style={{ flex: 1 }}>
                    <Text style={styles.title}>{text1}</Text>
                    {text2 ? <Text style={styles.message}>{text2}</Text> : null}
                </View>
            </View>
        </View>
    ),
}

const styles = StyleSheet.create({
    container: {
        width: '90%',
        alignSelf: 'center',
        marginBottom: 10,
    },
    toastBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.Light_color,
        padding: 16,
        borderRadius: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 6,
    },
    leftBar: {
        width: 5,
        height: '100%',
        backgroundColor: colors.IconColor,
        borderRadius: 4,
        marginRight: 12,
    },
    title: {
        fontSize: 15,
        fontFamily: 'Inter-SemiBold',
        color: '#0F172A',
    },
    message: {
        fontSize: 13,
        color: '#475569',
        fontFamily: 'Inter-Regular',
        marginTop: 2,
    },
})

export default toastConfig

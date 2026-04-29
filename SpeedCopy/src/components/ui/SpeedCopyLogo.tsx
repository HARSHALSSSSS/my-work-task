import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Path, Mask, G } from 'react-native-svg';
import { useThemeStore } from '../../store/useThemeStore';

interface SpeedCopyLogoProps {
  size?: 'sm' | 'lg';
}

const ICON_SCALE = { sm: 0.8, lg: 1.2 };
const TEXT_SIZE = { sm: 20, lg: 32 };

function LogoIcon({ scale = 1, color }: { scale?: number; color: string }) {
  const w = 35 * scale;
  const h = 35 * scale;

  return (
    <Svg width={w} height={h} viewBox="0 0 35 35" fill="none">
      <Rect width="35" height="35" rx="5" fill="transparent" />
      <Path
        d="M6.81651 22.5648C5.64892 21.7394 4.69403 20.6423 4.02991 19.3653C3.36578 18.0885 3.01279 16.6687 3.00034 15.225C2.98789 13.7813 3.31713 12.3555 3.95862 11.067C4.60012 9.77855 5.53691 8.66476 6.68979 7.81888C7.84268 6.97298 9.17885 6.41958 10.5852 6.20496C11.9926 5.99034 13.4295 6.12074 14.7769 6.58525C16.1233 7.04977 17.3418 7.83489 18.3284 8.87494C19.3149 9.91499 20.0424 11.1797 20.4486 12.5634H22.7272C24.077 12.5639 25.3848 13.0489 26.4167 13.9325C27.4496 14.8163 28.1409 16.0419 28.3694 17.3928C28.598 18.7438 28.3491 20.1333 27.6657 21.3158C26.9823 22.4983 25.9087 23.3976 24.6359 23.855"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Mask id="m1" maskUnits="userSpaceOnUse" x="10" y="19" width="11" height="11">
        <Path d="M20.116 19.6576H10.4302V29.4869H20.116V19.6576Z" fill="white" />
      </Mask>
      <G mask="url(#m1)">
        <Path
          d="M13.3049 26.676H12.4971C12.2833 26.676 12.0785 26.5897 11.9269 26.436C11.7753 26.2825 11.6904 26.0741 11.6904 25.8569V23.8092C11.6904 23.5918 11.7753 23.3836 11.9269 23.2299C12.0785 23.0763 12.2833 22.99 12.4971 22.99H18.9551C19.1689 22.99 19.3737 23.0763 19.5253 23.2299C19.6769 23.3836 19.7617 23.5918 19.7617 23.8092V25.8569C19.7617 26.0741 19.6769 26.2825 19.5253 26.436C19.3737 26.5897 19.1689 26.676 18.9551 26.676H18.1473M13.3049 22.99V20.5327C13.3049 20.4241 13.3468 20.32 13.4226 20.2432C13.4984 20.1663 13.6013 20.1232 13.7077 20.1232H17.7445C17.8508 20.1232 17.9538 20.1663 18.0296 20.2432C18.1054 20.32 18.1473 20.4241 18.1473 20.5327V22.99M13.7077 25.0378H17.7445C17.9674 25.0378 18.1473 25.2212 18.1473 25.4474V27.9046C18.1473 28.1308 17.9674 28.3142 17.7445 28.3142H13.7077C13.4848 28.3142 13.3049 28.1308 13.3049 27.9046V25.4474C13.3049 25.2212 13.4848 25.0378 13.7077 25.0378Z"
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </G>
    </Svg>
  );
}

export const SpeedCopyLogo: React.FC<SpeedCopyLogoProps> = ({ size = 'sm' }) => {
  const { colors: t } = useThemeStore();
  const iconScale = ICON_SCALE[size];
  const fontSize = TEXT_SIZE[size];

  return (
    <View style={styles.container}>
      <Text style={[styles.text, { fontSize, lineHeight: fontSize * 1.3, color: t.textPrimary }]}>speedcopy</Text>
      <LogoIcon scale={iconScale} color={t.textPrimary} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  text: {
    fontFamily: 'Poppins_600SemiBold',
  },
});

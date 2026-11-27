package com.reveltechnologies.filesizeminimizer;

import android.os.Bundle;
import androidx.core.splashscreen.SplashScreen;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        SplashScreen.installSplashScreen(this);
        registerPlugin(PlayUpdatePlugin.class);
        super.onCreate(savedInstanceState);
    }
}

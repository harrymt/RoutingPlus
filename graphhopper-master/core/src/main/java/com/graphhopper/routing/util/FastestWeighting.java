/*
 *  Licensed to GraphHopper and Peter Karich under one or more contributor
 *  license agreements. See the NOTICE file distributed with this work for 
 *  additional information regarding copyright ownership.
 * 
 *  GraphHopper licenses this file to you under the Apache License, 
 *  Version 2.0 (the "License"); you may not use this file except in 
 *  compliance with the License. You may obtain a copy of the License at
 * 
 *       http://www.apache.org/licenses/LICENSE-2.0
 * 
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
package com.graphhopper.routing.util;

import com.graphhopper.util.EdgeIteratorState;

import java.util.Map;

import java.util.HashMap;

/**
 * Calculates the fastest route with the specified vehicle (VehicleEncoder).
 * <p/>
 * @author Peter Karich
 * @author G52GRP GROUP
 */
public class FastestWeighting implements Weighting
{
    private final FlagEncoder encoder;
    private final double maxSpeed;
	//BEGIN G52GRP GROUP
    private int motorwayPref = 1;
    private int mainRoadPref = 1;
    private int trafficSignalPref = 1;
    private int residentialPref = 1;
    private int rightTurnPref = 1;
	//END G52GRP GROUP

    public FastestWeighting( FlagEncoder encoder )
    {
        this.encoder = encoder;
        maxSpeed = encoder.getMaxSpeed();
    }

    @Override
    public double getMinWeight( double distance )
    {
        return distance / maxSpeed;
    }

@Override
    public double calcWeight( EdgeIteratorState edge, boolean reverse )
    {
        // BEGIN G52GRP GROUP
        // retrieve the encoded value
        double speed = edge.getFlags() / 4;

        // obtain the highway code from the value (also states whether a way has traffic light on it)
        int highway = Integer.parseInt(String.valueOf(speed).substring(0,2));

        // first two numbers are reserved for highway
        speed = Double.parseDouble(String.valueOf(speed).substring(2));

        //END G52GRP GROUP
        if (speed == 0) // if the road is unaccessible, return a massive weighting value
            return Double.POSITIVE_INFINITY; // this ensures that the road is never travelled down
        //BEGIN G52GRP GROUP

        // modifier changes the road weighting depending on user preferences
        double modifier = 1;

        // if highway is greater than 30, traffic lights are on the road
        // (since highway is saved as values between 10 and 25)
        if (highway > 30) {
            // highway was encoded as highway + 20 (if traffic lights)
            highway -= 20; // get actual highway value for preferences
            modifier *= 0.5 + (trafficSignalPref * 0.1);
        }


        switch(highway){ 
            case 10: // this is a motorway
            // *= used to keep the preference of traffic lights
            modifier *= 0.5 + (motorwayPref * 0.2);
            modifier *= 0.5 + (mainRoadPref * 0.2);
            break;
            case 11: // this is a motorway_link
            modifier *= 0.5 + (motorwayPref * 0.2);  
            modifier *= 0.5 + (mainRoadPref * 0.2);
            break;
            case 12: // this is a trunk
            modifier *= 0.5 + (mainRoadPref * 0.2); 
            break;
            case 13: // this is a trunk_link
            modifier *= 0.5 + (mainRoadPref * 0.2);
            break;
            case 14: // this is a primary road
            modifier *= 0.5 + (mainRoadPref * 0.2);
            break;
            case 15: // this is a primary_link
            modifier *= 0.5 + (mainRoadPref * 0.2);
            break;
            case 16: // this is a secondary road
            modifier *= 0.5 + (mainRoadPref * 0.2);
            break;
            case 17: // this is a secondary_link
            modifier *= 0.5 + (mainRoadPref * 0.2);
            break;
            case 18: // this is a tertiary road
            //modifier *= 0.5 + (motorwayPref * 0.1);  
            break;
            case 19: // this is a tertiary_link
            //modifier *= 0.5 + (motorwayPref * 0.1);  
            break;
            case 20: // this is a unclassified road
            modifier *= 0.5 + (residentialPref * 0.2);  
            break;
            case 21: // this is a residential road
            modifier *= 0.5 + (residentialPref * 0.2);
            break;
            case 22: // this is a living_street
            modifier *= 0.5 + (residentialPref * 0.2);
            break;
            case 23: // this is a service road
            //modifier *= 0.5 + (motorwayPref * 0.1);  
            break;
            case 24: // this is a road
            //modifier *= 0.5 + (motorwayPref * 0.1);  
            break;
            case 25: // this is a track
            modifier *= 0.5 + (residentialPref * 0.2);
            break;

        }

        // return the weight of the road after being modified by user prefs
        return (edge.getDistance()) / (speed * modifier);
        // END G52GRP GROUP
    }

    @Override
    public String toString()
    {
        return "FASTEST|" + encoder;
    }

	//BEGIN G52GRP GROUP
    @Override
    public void setPrefs(int motorway, int mainRoads, int trafficSignals, int residential, int rightTurns) {
        // pass in the preferences chosen by the user in the servlet
        motorwayPref = motorway;
        mainRoadPref = mainRoads;
        trafficSignalPref = trafficSignals;
        residentialPref = residential;
        rightTurnPref = rightTurns;
    }
}

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
package com.graphhopper;

import com.graphhopper.util.shapes.GHPlace;
import java.util.HashMap;
import java.util.Map;

/**
 * GraphHopper request wrapper to simplify requesting GraphHopper.
 * <p/>
 * @author Peter Karich
 * @author G52GRP GROUP
 */
public class GHRequest {
    private String algo = "dijkstrabi";
    private GHPlace from;
    private GHPlace to;
    private Map < String, Object > hints = new HashMap < String, Object > (5);
    private String vehicle = "CAR";
    private String weighting = "shortest";
    //BEGIN G52GRP GROUP
    private int motorwayPref = 1;
    private int trafficSignalPref = 1;
    private int mainRoadPref = 1;
    private int rightTurnPref = 1;
    private int residentialPref = 1;
    //END G52GRP GROUP


    /**
     * Calculate the path from specified startPoint (fromLat, fromLon) to endPoint (toLat, toLon).
     */
    public GHRequest(double fromLat, double fromLon, double toLat, double toLon) {
        this(new GHPlace(fromLat, fromLon), new GHPlace(toLat, toLon));
    }

    /**
     * Calculate the path from specified startPoint to endPoint.
     */
    public GHRequest(GHPlace startPoint, GHPlace endPoint) {
        this.from = startPoint;
        this.to = endPoint;
    }

    public void check() {
        if (from == null)
            throw new IllegalStateException("the 'from' point needs to be initialized but was null");

        if (to == null)
            throw new IllegalStateException("the 'to' point needs to be initialized but was null");
    }

    public GHPlace getFrom() {
        return from;
    }

    public GHPlace getTo() {
        return to;
    }

    // BEGIN G52GRP GROUP
    public GHRequest setPrefs(int motorway, int mainRoads, int trafficSignals, int residential, int rightTurns){
        //set the preferences so they can be accessed via GraphHopper.java (GHResponse route( GHRequest request ))
        this.motorwayPref = motorway;
        this.mainRoadPref = mainRoads;
        this.trafficSignalPref = trafficSignals;
        this.residentialPref = residential;
        this.rightTurnPref = rightTurns;
        return this;
    }

    public int getMotorwayPreference() {
        return motorwayPref;
    }

    public int getMainRoadPreference() {
        return mainRoadPref;
    }

    public int getTrafficSignalPreference() {
        return trafficSignalPref;
    }

    public int getResidentialPreference() {
        return residentialPref;
    }

    public int getRightTurnPreference() {
        return rightTurnPref;
    }// END G52GRP GROUP


    /**
     * Possible values: astar (A* algorithm, default), astarbi (bidirectional A*) dijkstra
     * (Dijkstra), dijkstrabi and dijkstraNativebi (a bit faster bidirectional Dijkstra).
     */
    public GHRequest setAlgorithm(String algo) {
        this.algo = algo;
        return this;
    }

    public String getAlgorithm() {
        return algo;
    }

    public GHRequest putHint(String key, Object value) {
        Object old = hints.put(key, value);
        if (old != null)
            throw new RuntimeException("Key is already associated with " + old + ", your value:" + value);

        return this;
    }

    @
    SuppressWarnings("unchecked")
    public < T > T getHint(String key, T defaultValue) {
        Object obj = hints.get(key);
        if (obj == null)
            return defaultValue;

        return (T) obj;
    }

    @
    Override
    public String toString() {
        return from + " " + to + " (" + algo + ")";
    }

    /**
     * By default it supports fastest and shortest
     */
    public GHRequest setWeighting(String w) {
        this.weighting = w;
        return this;
    }

    public String getWeighting() {
        return weighting;
    }

    public GHRequest setVehicle(String vehicle) {
        this.vehicle = vehicle;
        return this;
    }

    public String getVehicle() {
        return vehicle;
    }
}
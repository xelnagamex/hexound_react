import React, { Component } from 'react';

export default class TrackList extends Component{
    render(){       
        const { trackList: list, track, play } = this.props;
        return(
            <h2>GrabnDrop, play: {`${play}`}, track: {track}</h2>
        )
    }
}
import React, {Component} from 'react'

export default class Stop extends Component{
    render(){
        const { width, height } = this.props;
        return(
            <svg width={width} height={height} aria-hidden="true" focusable="false" data-prefix="fas" data-icon="stop" className="svg-inline--fa fa-stop fa-w-14" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path fill="currentColor" d="M400 32H48C21.5 32 0 53.5 0 80v352c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V80c0-26.5-21.5-48-48-48z"></path></svg>
        )
    }
}
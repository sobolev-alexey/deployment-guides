import React from 'react';
import io from 'socket.io-client';
import './App.css';

class App extends React.Component {
    socket;

    constructor() {
        super();

        const hostParts = window.location.hostname.split(".");

        this.socket = io(hostParts.length === 1 ? 'http://localhost:3001' : `https://my-iota-api-az.${hostParts[1]}.${hostParts[2]}`);
        this.socket.on('connect', () => {
            this.setState({
                progress: this.state.progress + '\nConnected'
            });
        });
        this.socket.on('message', (data) => {
            this.setState({
                progress: this.state.progress + `\nReceived ${data}`
            });
        });
        this.socket.on('disconnect',  () => {
            this.setState({
                progress: this.state.progress + '\nDisconnected'
            });
        });

        this.state = {
            progress: ""
        };

        this.sendEvent = this.sendEvent.bind(this);
    }

    sendEvent() {
        this.setState({
            progress: this.state.progress + '\nSending ping'
        });

        this.socket.send("ping");
    }

    render() {
        return (
            <div className="App">
                <h1>Example App</h1>
                <button onClick={() => this.sendEvent()}>Send</button>
                <pre>{this.state.progress}</pre>
            </div>
        );
    }
}

export default App;

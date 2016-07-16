import Html exposing (Html, button, div, text, table, tr, td)
import Html.App as Html
import String
import Navigation
import Suites
import Router exposing (..)
import Phoenix.Socket
import Phoenix.Channel
import Phoenix.Push

type alias Model =
  {- world state -}
  { suites : Suites.Model
  , suite: Maybe Suites.Suite
  {-app state -}
  , page : Page
  , socket : Phoenix.Socket.Socket Msg
  , channel : Phoenix.Channel.Channel Msg
  }


type Msg
  = SuitesAction Suites.Action
  | PhoenixMsg (Phoenix.Socket.Msg Msg)
  | ShowJoinedMessage String
  | ShowLeftMessage String


main = Navigation.program (Navigation.makeParser urlParser)
  { init = init
  , view = view
  , update = update
  , urlUpdate = urlUpdate
  , subscriptions = subscriptions
  }

initSocket : (Phoenix.Socket.Socket Msg, Phoenix.Channel.Channel Msg, Cmd Msg)
initSocket =
  let
    socket = Phoenix.Socket.init  "ws://localhost:4000/socket/websocket"
      |> Phoenix.Socket.withDebug

    channel = Phoenix.Channel.init "api"
      --|> Phoenix.Channel.withPayload userParams
      |> Phoenix.Channel.onJoin (always (ShowJoinedMessage "joined api"))
      |> Phoenix.Channel.onClose (always (ShowLeftMessage "left api"))

    (sock, cmd) = Phoenix.Socket.join channel socket
  in
    ( sock, channel, Cmd.map PhoenixMsg cmd )


initialState =
  let
    ( socket, channel, cmd ) = initSocket
  in
    ({ suites = Suites.model
    , page = SuitesPage
    , suite = Nothing
    , socket = socket
    , channel = channel
    }, cmd)

init : Result String Page -> (Model, Cmd Msg)
init result =
  let
    (preModel, phxCmd) = initialState
    (model, urlCmd) = urlUpdate result preModel
  in
    (model, Cmd.batch([phxCmd, urlCmd]))

update : Msg -> Model -> (Model, Cmd Msg)
update msg model =
  --let 
    --foo = Debug.log "model" model
  --in
    case Debug.log "msg" msg of
      SuitesAction action ->
        let 
          (suiteState, suiteCmd) = Suites.update action model.suites
        in
          { model 
          | suites = suiteState 
          } ! [(Cmd.map SuitesAction suiteCmd)]
      PhoenixMsg msg ->
        let
          ( socket, phxCmd ) = Phoenix.Socket.update msg model.socket
        in
          ( { model | socket = socket }
          , Cmd.map PhoenixMsg (Debug.log "phxCmd" phxCmd)
          )
      ShowJoinedMessage msg ->
        let
          foo = Debug.log "joined channel" msg
        in
          model ! []
      ShowLeftMessage msg ->
        let
          foo = Debug.log "left channel" msg
        in
          model ! []


view : Model -> Html Msg
view model =
  div [] [
    viewForRoute model
  ]


viewForRoute : Model -> Html Msg
viewForRoute model =
  case model.page of
    SuitesPage ->
      Html.map (\action -> SuitesAction action) (Suites.listView model.suites)
    SuitePage _ ->
      Html.map (\action -> SuitesAction action) (Suites.singleView model.suite)

subscriptions : Model -> Sub Msg
subscriptions model =
  Phoenix.Socket.listen model.socket PhoenixMsg


urlUpdate : Result String Page -> Model -> (Model, Cmd Msg)
urlUpdate result model =
  case Debug.log "result" result of
    Err _ -> model ! [ Navigation.modifyUrl (pageToRoute model.page)]
    Ok page -> 
      let 
        newModel = { model | page = page }
      in
        case page of
          SuitesPage -> 
            { newModel | suites = (Suites.urlUpdate page newModel.suites)} ! []
          SuitePage id -> 
            newModel ! []

